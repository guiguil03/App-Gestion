import { randomUUID } from 'node:crypto';

import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Checkpoint, AttendanceDirection, Prisma } from '@prisma/client';
import type { AttendanceRecord } from '@prisma/client';
import * as Sentry from '@sentry/nestjs';

import { PrismaService } from '@/database/prisma.service';
import type { AuthenticatedUser } from '@/modules/auth/types';
import { AuditService } from '@/modules/audit/audit.service';
import { dateKey } from '@/modules/absences/date-key';
import {
  ATTENDANCE_RECORDED_EVENT,
  AttendanceRecordedEvent,
} from '@/modules/attendance/events/attendance-recorded.event';
import { isWithinScanWindow } from '@/modules/attendance/geofence';
import { LateDetectionService } from '@/modules/attendance/late-detection.service';
import type { RawAttendanceRecord } from '@/modules/sync/dto/push-changes.dto';
import { StudentsService } from '@/modules/students/students.service';

// Code Prisma pour une violation de contrainte unique — ici (session_id,
// student_id) : un rejeu de push (retry après coupure) ne doit pas planter.
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

export type AttendanceRejectionReason = 'scan_window';

export type RecordFromSyncResult = AttendanceRecord | { rejected: true; id: string; reason: AttendanceRejectionReason };

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
    private readonly audit: AuditService,
  ) {}

  /**
   * Persiste un pointage poussé par l'app mobile. Le retard est recalculé
   * côté serveur (source de vérité), la valeur envoyée par l'appareil ne
   * servait qu'au feedback immédiat affiché à l'enseignant/surveillant.
   * Idempotent : un id déjà reçu n'écrase pas l'enregistrement existant, ce
   * qui permet au mobile de rejouer un push sans risque en cas de coupure.
   */
  async recordFromSync(user: AuthenticatedUser, raw: RawAttendanceRecord): Promise<RecordFromSyncResult | null> {
    if (!user.schoolId) return null; // ADMIN/DIRECTION sans école ne poussent pas de pointages

    const student = await this.students.assertBelongsToSchool(raw.student_id, user.schoolId);
    const school = await this.prisma.school.findUniqueOrThrow({ where: { id: user.schoolId } });
    const recordedAt = new Date(raw.recorded_at);

    // Défense en profondeur : la validation "vraie" a déjà eu lieu côté
    // appareil (feedback immédiat à l'enseignant/élève, y compris hors
    // ligne) — ceci ne fait que rejeter silencieusement un pointage qui
    // l'aurait quand même franchie (client modifié). École sans plage
    // configurée (scanWindow* à null) : aucune restriction, comportement
    // identique à avant.
    if (school.scanWindowStart && school.scanWindowEnd) {
      if (!isWithinScanWindow(school.scanWindowStart, school.scanWindowEnd, recordedAt)) {
        this.logger.warn(`Pointage ${raw.id} rejeté : hors de la plage horaire de pointage de l'école ${school.id}`);
        Sentry.metrics.count('attendance.rejected', 1, { attributes: { reason: 'scan_window' } });
        return { rejected: true, id: raw.id, reason: 'scan_window' };
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
          isManual: raw.is_manual ?? false,
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
    Sentry.metrics.count('attendance.recorded', 1, {
      attributes: { source: raw.is_manual ? 'mobile_manual' : 'sync', is_late: String(isLate) },
    });

    // Traçabilité de qui a fait un pointage manuel (élève sans carte) — la
    // vérification cryptographique de la carte étant contournée, on garde au
    // moins une trace de l'enseignant/surveillant à l'origine du pointage.
    // Best-effort (voir AuditService) : ne doit jamais faire échouer le sync.
    if (raw.is_manual) {
      await this.audit.log({
        schoolId: user.schoolId,
        userId: user.userId,
        username: user.username,
        role: user.role,
        action: 'attendance.manual_record',
        targetType: 'student',
        targetId: student.id,
        metadata: { source: 'mobile', checkpoint: raw.checkpoint, isLate },
      });
    }

    // N'importe quel pointage (même tardif, même Salle de classe, même
    // SORTIE) annule une absence déjà marquée par AbsenceDetectionJob pour ce
    // jour — voir AbsencesService.detectAbsences pour la même règle en sens
    // inverse (n'importe quel pointage du jour = présent).
    await this.prisma.absence.deleteMany({ where: { studentId: student.id, date: dateKey(recordedAt) } });

    this.events.emit(
      ATTENDANCE_RECORDED_EVENT,
      new AttendanceRecordedEvent(record.id, student.id, user.schoolId, isLate, recordedAt),
    );

    return record;
  }

  /**
   * Correction administrative depuis le dashboard (fiche élève) — pour le
   * cas où le pointage réel (scan carte/session) a été oublié côté mobile.
   * Volontairement un override libre de la Direction : contrairement à
   * `recordFromSync`, aucune vérification de périmètre GPS ni de plage
   * horaire (une correction faite depuis un bureau n'a pas de position GPS
   * pertinente). Même comportement que le pointage réel une fois créé :
   * annule une absence déjà détectée pour ce jour, déclenche la même
   * notification parent.
   */
  async recordManual(
    studentId: string,
    schoolId: string,
    opts: { date: string; time: string; isLate: boolean },
  ) {
    const student = await this.students.assertBelongsToSchool(studentId, schoolId);
    const recordedAt = new Date(`${opts.date}T${opts.time}:00`);

    const record = await this.prisma.attendanceRecord.create({
      data: {
        id: randomUUID(),
        studentId: student.id,
        checkpoint: Checkpoint.PORTAIL,
        direction: AttendanceDirection.ENTREE,
        recordedAt,
        isLate: opts.isLate,
      },
    });

    this.logger.log(`Pointage manuel ${record.id} enregistré pour l'élève ${student.id} (retard=${opts.isLate})`);
    Sentry.metrics.count('attendance.recorded', 1, {
      attributes: { source: 'manual', is_late: String(opts.isLate) },
    });

    await this.prisma.absence.deleteMany({ where: { studentId: student.id, date: dateKey(recordedAt) } });

    this.events.emit(
      ATTENDANCE_RECORDED_EVENT,
      new AttendanceRecordedEvent(record.id, student.id, schoolId, opts.isLate, recordedAt),
    );

    return record;
  }

  /**
   * Liste des pointages bruts d'une journée — contrepartie de la page
   * Absences (§3.6) : suivi au jour le jour de qui a effectivement pointé,
   * plutôt qu'un statut agrégé par élève/période comme ReportsService. Une
   * ligne par pointage (un élève peut apparaître deux fois : portail + classe).
   */
  async listForDay(schoolId: string, opts: { date: string; schoolClassId?: string; search?: string }) {
    const startOfDay = new Date(`${opts.date}T00:00:00`);
    const endOfDay = new Date(`${opts.date}T23:59:59.999`);
    const term = opts.search?.trim();

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        student: {
          schoolId,
          schoolClassId: opts.schoolClassId,
          deletedAt: null,
          ...(term
            ? {
                OR: [
                  { lastName: { contains: term, mode: 'insensitive' as const } },
                  { firstName: { contains: term, mode: 'insensitive' as const } },
                  { middleName: { contains: term, mode: 'insensitive' as const } },
                ],
              }
            : {}),
        },
        recordedAt: { gte: startOfDay, lte: endOfDay },
      },
      include: { student: { include: { schoolClass: true } } },
      orderBy: { recordedAt: 'desc' },
    });

    return records.map((record) => ({
      id: record.id,
      student: {
        id: record.student.id,
        lastName: record.student.lastName,
        middleName: record.student.middleName,
        firstName: record.student.firstName,
        schoolClass: {
          id: record.student.schoolClass.id,
          name: record.student.schoolClass.name,
          promotion: record.student.schoolClass.promotion,
        },
      },
      checkpoint: record.checkpoint,
      direction: record.direction,
      recordedAt: record.recordedAt.toISOString(),
      isLate: record.isLate,
      isManual: record.isManual,
    }));
  }
}

function toHHmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
