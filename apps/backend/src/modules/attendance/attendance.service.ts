import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Checkpoint, AttendanceDirection, Prisma } from '@prisma/client';

import { PrismaService } from '@/database/prisma.service';
import type { AuthenticatedUser } from '@/modules/auth/types';
import { dateKey } from '@/modules/absences/date-key';
import {
  ATTENDANCE_RECORDED_EVENT,
  AttendanceRecordedEvent,
} from '@/modules/attendance/events/attendance-recorded.event';
import { type GeoPoint, isWithinGeofence, isWithinScanWindow } from '@/modules/attendance/geofence';
import { LateDetectionService } from '@/modules/attendance/late-detection.service';
import type { RawAttendanceRecord } from '@/modules/sync/dto/push-changes.dto';
import { StudentsService } from '@/modules/students/students.service';

// Code Prisma pour une violation de contrainte unique — ici (session_id,
// student_id) : un rejeu de push (retry après coupure) ne doit pas planter.
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

function toCheckpoint(value: string): Checkpoint {
  return value.toUpperCase() === 'CLASSE' ? Checkpoint.CLASSE : Checkpoint.PORTAIL;
}

function toDirection(value: string): AttendanceDirection {
  return value.toUpperCase() === 'SORTIE' ? AttendanceDirection.SORTIE : AttendanceDirection.ENTREE;
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly students: StudentsService,
    private readonly lateDetection: LateDetectionService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Persiste un pointage poussé par l'app mobile. Le retard est recalculé
   * côté serveur (source de vérité), la valeur envoyée par l'appareil ne
   * servait qu'au feedback immédiat affiché à l'enseignant/surveillant.
   * Idempotent : un id déjà reçu n'écrase pas l'enregistrement existant, ce
   * qui permet au mobile de rejouer un push sans risque en cas de coupure.
   */
  async recordFromSync(user: AuthenticatedUser, raw: RawAttendanceRecord) {
    if (!user.schoolId) return null; // ADMIN/DIRECTION sans école ne poussent pas de pointages

    const student = await this.students.assertBelongsToSchool(raw.student_id, user.schoolId);
    const school = await this.prisma.school.findUniqueOrThrow({ where: { id: user.schoolId } });
    const recordedAt = new Date(raw.recorded_at);

    // Défense en profondeur : la validation "vraie" a déjà eu lieu côté
    // appareil (feedback immédiat à l'enseignant/élève, y compris hors
    // ligne) — ceci ne fait que rejeter silencieusement un pointage qui
    // l'aurait quand même franchie (client modifié, coordonnées absentes).
    // Écoles sans périmètre/plage configurés (geofenceCorners/scanWindow*
    // à null) : aucune restriction, comportement identique à avant.
    if (school.geofenceCorners) {
      const corners = school.geofenceCorners as unknown as GeoPoint[];
      const hasCoords = typeof raw.latitude === 'number' && typeof raw.longitude === 'number';
      if (!hasCoords || !isWithinGeofence(corners, { lat: raw.latitude as number, lng: raw.longitude as number })) {
        this.logger.warn(`Pointage ${raw.id} rejeté : hors du périmètre de l'école ${school.id}`);
        return null;
      }
    }
    if (school.scanWindowStart && school.scanWindowEnd) {
      if (!isWithinScanWindow(school.scanWindowStart, school.scanWindowEnd, recordedAt)) {
        this.logger.warn(`Pointage ${raw.id} rejeté : hors de la plage horaire de pointage de l'école ${school.id}`);
        return null;
      }
    }

    let session = null;
    if (raw.session_id) {
      session = await this.prisma.attendanceSession.findFirst({
        where: { id: raw.session_id, schoolId: user.schoolId },
      });
      if (!session) {
        throw new ForbiddenException('Session de présence introuvable');
      }
      if (session.schoolClassId !== student.schoolClassId) {
        throw new ForbiddenException("La session ne correspond pas à la classe de l'élève");
      }
    }

    // Un pointage via session est en retard s'il arrive après l'ouverture de
    // la session (+ tolérance de l'école) ; un scan de carte classique reste
    // évalué contre l'heure de référence de l'école (portail du matin).
    const isLate = session
      ? this.lateDetection.isLate(toHHmm(session.openedAt), school.attendanceToleranceMinutes, recordedAt)
      : this.lateDetection.isLate(school.attendanceReferenceTime, school.attendanceToleranceMinutes, recordedAt);

    let record;
    try {
      record = await this.prisma.attendanceRecord.upsert({
        where: { id: raw.id },
        create: {
          id: raw.id,
          studentId: student.id,
          checkpoint: toCheckpoint(raw.checkpoint),
          direction: toDirection(raw.direction),
          recordedAt,
          isLate,
          sessionId: session?.id,
          latitude: raw.latitude ?? undefined,
          longitude: raw.longitude ?? undefined,
        },
        update: {},
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION) {
        // L'élève a déjà un pointage pour cette session (rejeu de push) : no-op.
        return this.prisma.attendanceRecord.findFirst({ where: { sessionId: session?.id, studentId: student.id } });
      }
      throw error;
    }

    this.logger.log(`Pointage ${record.id} enregistré pour l'élève ${student.id} (retard=${isLate})`);

    // Un pointage PORTAIL/ENTREE (même tardif) annule une absence déjà
    // marquée par AbsenceDetectionJob pour ce jour — un retard n'est pas une
    // absence.
    if (
      toCheckpoint(raw.checkpoint) === Checkpoint.PORTAIL &&
      toDirection(raw.direction) === AttendanceDirection.ENTREE
    ) {
      await this.prisma.absence.deleteMany({ where: { studentId: student.id, date: dateKey(recordedAt) } });
    }

    this.events.emit(
      ATTENDANCE_RECORDED_EVENT,
      new AttendanceRecordedEvent(record.id, student.id, user.schoolId, isLate, recordedAt),
    );

    return record;
  }
}

function toHHmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
