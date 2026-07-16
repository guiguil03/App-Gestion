import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { PrismaService } from '@/database/prisma.service';
import { dateKey } from '@/modules/absences/date-key';
import { ABSENCE_MARKED_EVENT, AbsenceMarkedEvent } from '@/modules/absences/events/absence-marked.event';

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function deadlineMinutes(referenceTime: string, toleranceMinutes: number): number {
  const [hours, minutes] = referenceTime.split(':').map(Number);
  return hours * 60 + minutes + toleranceMinutes;
}

@Injectable()
export class AbsencesService {
  private readonly logger = new Logger(AbsencesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Marque absent tout élève sans pointage PORTAIL/ENTREE du jour, pour les
   * écoles ayant dépassé leur heure de référence + tolérance. Idempotent :
   * un élève déjà marqué absent aujourd'hui n'est jamais retraité (voir
   * `Absence.@@unique([studentId, date])`). Appelée par `AbsenceDetectionJob`
   * toutes les 5 minutes — `now` est un paramètre pour rester testable.
   */
  async detectAbsences(now: Date = new Date()): Promise<void> {
    const date = dateKey(now);
    const schools = await this.prisma.school.findMany({ where: { deletedAt: null } });

    for (const school of schools) {
      const deadline = deadlineMinutes(school.attendanceReferenceTime, school.attendanceToleranceMinutes);
      if (minutesSinceMidnight(now) < deadline) continue;

      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const [students, presentRecords, existingAbsences] = await Promise.all([
        this.prisma.student.findMany({ where: { schoolId: school.id, deletedAt: null }, select: { id: true } }),
        this.prisma.attendanceRecord.findMany({
          where: {
            student: { schoolId: school.id },
            checkpoint: 'PORTAIL',
            direction: 'ENTREE',
            recordedAt: { gte: startOfDay },
          },
          select: { studentId: true },
        }),
        this.prisma.absence.findMany({ where: { student: { schoolId: school.id }, date }, select: { studentId: true } }),
      ]);

      const presentIds = new Set(presentRecords.map((r) => r.studentId));
      const alreadyMarkedIds = new Set(existingAbsences.map((a) => a.studentId));
      const toMark = students.filter((s) => !presentIds.has(s.id) && !alreadyMarkedIds.has(s.id));

      for (const student of toMark) {
        const absence = await this.prisma.absence.upsert({
          where: { studentId_date: { studentId: student.id, date } },
          create: { studentId: student.id, date },
          update: {},
        });
        this.logger.log(`Absence ${absence.id} marquée pour l'élève ${student.id} (${date})`);
        this.events.emit(ABSENCE_MARKED_EVENT, new AbsenceMarkedEvent(absence.id, student.id, school.id, date));
      }
    }
  }

  async list(schoolId: string, schoolClassId?: string, studentId?: string) {
    return this.prisma.absence.findMany({
      where: { studentId, student: { schoolId, schoolClassId } },
      include: { student: true },
      orderBy: { date: 'desc' },
    });
  }

  async justify(
    absenceId: string,
    schoolId: string,
    reason: string,
    user: { role: string; userId: string },
  ) {
    const absence = await this.prisma.absence.findFirst({ where: { id: absenceId, student: { schoolId } } });
    if (!absence) throw new ForbiddenException('Absence introuvable');

    if (user.role === 'PARENT') {
      const link = await this.prisma.user.findFirst({
        where: { id: user.userId, children: { some: { id: absence.studentId } } },
      });
      if (!link) throw new ForbiddenException("Cette absence ne concerne pas un enfant de ce compte");
    }

    return this.prisma.absence.update({
      where: { id: absenceId },
      data: { justified: true, justificationReason: reason },
    });
  }
}
