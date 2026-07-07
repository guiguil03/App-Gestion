import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Checkpoint, AttendanceDirection } from '@prisma/client';

import { PrismaService } from '@/database/prisma.service';
import type { AuthenticatedUser } from '@/modules/auth/types';
import {
  ATTENDANCE_RECORDED_EVENT,
  AttendanceRecordedEvent,
} from '@/modules/attendance/events/attendance-recorded.event';
import { LateDetectionService } from '@/modules/attendance/late-detection.service';
import type { RawAttendanceRecord } from '@/modules/sync/dto/push-changes.dto';
import { StudentsService } from '@/modules/students/students.service';

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
    const isLate = this.lateDetection.isLate(
      school.attendanceReferenceTime,
      school.attendanceToleranceMinutes,
      recordedAt,
    );

    const record = await this.prisma.attendanceRecord.upsert({
      where: { id: raw.id },
      create: {
        id: raw.id,
        studentId: student.id,
        checkpoint: toCheckpoint(raw.checkpoint),
        direction: toDirection(raw.direction),
        recordedAt,
        isLate,
      },
      update: {},
    });

    this.logger.log(`Pointage ${record.id} enregistré pour l'élève ${student.id} (retard=${isLate})`);

    this.events.emit(
      ATTENDANCE_RECORDED_EVENT,
      new AttendanceRecordedEvent(record.id, student.id, user.schoolId, isLate, recordedAt),
    );

    return record;
  }
}
