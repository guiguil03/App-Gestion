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

export type ConsecutiveAbsenceAlert = {
  studentId: string;
  studentName: string;
  schoolClassId: string;
  schoolClassName: string;
  consecutiveAbsences: number;
};

@Injectable()
export class AbsencesService {
  private readonly logger = new Logger(AbsencesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Marque absent tout élève sans aucun pointage du jour (peu importe le
   * checkpoint/la direction — Portail comme Salle de classe comptent), pour
   * les écoles ayant dépassé leur heure de référence + tolérance. Idempotent :
   * un élève déjà marqué absent aujourd'hui n'est jamais retraité (voir
   * `Absence.@@unique([studentId, date])`). Appelée par `AbsenceDetectionJob`
   * toutes les 5 minutes — `now` est un paramètre pour rester testable.
   */
  async detectAbsences(now: Date = new Date()): Promise<void> {
    const date = dateKey(now);
    const schools = await this.prisma.school.findMany({ where: { deletedAt: null } });

    for (const school of schools) {
      // École fermée ce jour (récurrent ou date ponctuelle) : aucun pointage
      // n'est attendu, donc aucune absence à détecter.
      if (school.closedWeekdays.includes(now.getDay())) continue;

      const deadline = deadlineMinutes(school.attendanceReferenceTime, school.attendanceToleranceMinutes);
      if (minutesSinceMidnight(now) < deadline) continue;

      const closureDate = await this.prisma.schoolClosureDate.findUnique({
        where: { schoolId_date: { schoolId: school.id, date } },
      });
      if (closureDate) continue;

      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const [students, presentRecords, existingAbsences] = await Promise.all([
        this.prisma.student.findMany({ where: { schoolId: school.id, deletedAt: null }, select: { id: true } }),
        // N'importe quel pointage du jour compte comme présent (Portail ou
        // Salle de classe, scan ou manuel) — un élève pointé "Salle de
        // classe" (carte oubliée) n'est pas moins présent qu'au portail ; le
        // restreindre à PORTAIL/ENTREE enverrait à tort un SMS "absent" à son
        // parent malgré un vrai pointage du jour.
        this.prisma.attendanceRecord.findMany({
          where: {
            student: { schoolId: school.id },
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

  /**
   * Élèves dont la série d'absences consécutives (en jours d'école, donc en
   * ignorant weekends/fermetures) atteint le seuil configuré pour l'école —
   * voir School.consecutiveAbsenceAlertThreshold. `null`/non configuré =
   * fonctionnalité désactivée pour cette école, liste toujours vide.
   */
  async listConsecutiveAbsenceAlerts(schoolId: string, now: Date = new Date()): Promise<ConsecutiveAbsenceAlert[]> {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    const threshold = school?.consecutiveAbsenceAlertThreshold;
    if (!school || !threshold) return [];

    // Un jour d'école ne "compte" que si son délai de détection est déjà
    // passé (sinon l'absence du jour même n'a pas encore été marquée, ce qui
    // casserait à tort une série en cours).
    const deadline = deadlineMinutes(school.attendanceReferenceTime, school.attendanceToleranceMinutes);
    const todayAlreadyDetected = minutesSinceMidnight(now) >= deadline;

    const closureDates = await this.prisma.schoolClosureDate.findMany({ where: { schoolId }, select: { date: true } });
    const closureDateSet = new Set(closureDates.map((c) => c.date));

    const LOOKBACK_CALENDAR_DAYS = 60;
    const schoolDays: string[] = [];
    const cursor = new Date(now);
    if (!todayAlreadyDetected) cursor.setDate(cursor.getDate() - 1);
    for (let i = 0; i < LOOKBACK_CALENDAR_DAYS; i++) {
      if (!school.closedWeekdays.includes(cursor.getDay()) && !closureDateSet.has(dateKey(cursor))) {
        schoolDays.push(dateKey(cursor));
      }
      cursor.setDate(cursor.getDate() - 1);
    }
    if (schoolDays.length < threshold) return [];

    const [students, absences] = await Promise.all([
      this.prisma.student.findMany({ where: { schoolId, deletedAt: null }, include: { schoolClass: true } }),
      this.prisma.absence.findMany({
        where: { student: { schoolId }, date: { gte: schoolDays[schoolDays.length - 1] } },
        select: { studentId: true, date: true },
      }),
    ]);

    const absentDatesByStudent = new Map<string, Set<string>>();
    for (const absence of absences) {
      const dates = absentDatesByStudent.get(absence.studentId) ?? new Set<string>();
      dates.add(absence.date);
      absentDatesByStudent.set(absence.studentId, dates);
    }

    const alerts: ConsecutiveAbsenceAlert[] = [];
    for (const student of students) {
      const absentDates = absentDatesByStudent.get(student.id);
      if (!absentDates) continue;

      let streak = 0;
      for (const day of schoolDays) {
        if (!absentDates.has(day)) break;
        streak++;
      }
      if (streak < threshold) continue;

      alerts.push({
        studentId: student.id,
        studentName: [student.lastName, student.middleName, student.firstName].filter(Boolean).join(' '),
        schoolClassId: student.schoolClass.id,
        schoolClassName: student.schoolClass.name,
        consecutiveAbsences: streak,
      });
    }

    return alerts.sort((a, b) => b.consecutiveAbsences - a.consecutiveAbsences);
  }

  /**
   * Déclare une absence "à l'avance" (ex. un parent prévient par téléphone
   * qu'un élève sera absent) plutôt que d'attendre la détection automatique
   * par `AbsenceDetectionJob` en fin de créneau. Idempotent via `upsert` sur
   * `Absence.@@unique([studentId, date])` : si le cron a déjà marqué
   * l'absence entre-temps (ou si on rappelle cette méthode), on met juste à
   * jour `justified`/`justificationReason` plutôt que de planter — et si
   * l'élève pointe finalement ce jour-là, `AttendanceService` supprime cette
   * absence comme n'importe quelle autre (voir son commentaire sur
   * `absence.deleteMany`). N'émet volontairement PAS `ABSENCE_MARKED_EVENT` :
   * le parent est par hypothèse déjà informé (c'est lui qui a prévenu),
   * inutile de lui renvoyer un SMS/push "votre enfant est absent".
   */
  async create(
    schoolId: string,
    dto: { studentId: string; date: string; justified?: boolean; justificationReason?: string },
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, schoolId, deletedAt: null },
    });
    if (!student) {
      throw new ForbiddenException("Élève hors du périmètre de l'école");
    }

    const absence = await this.prisma.absence.upsert({
      where: { studentId_date: { studentId: dto.studentId, date: dto.date } },
      create: { studentId: dto.studentId, date: dto.date, justified: dto.justified, justificationReason: dto.justificationReason },
      update: { justified: dto.justified, justificationReason: dto.justificationReason },
    });
    this.logger.log(`Absence ${absence.id} déclarée à l'avance pour l'élève ${dto.studentId} (${dto.date})`);
    return absence;
  }

  async list(schoolId: string, schoolClassId?: string, studentId?: string) {
    return this.prisma.absence.findMany({
      where: { studentId, student: { schoolId, schoolClassId } },
      include: { student: true },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Variante paginée + recherche serveur de `list` — utilisée par la page
   * Absences du dashboard (vue école entière, peut grossir vite). `list`
   * reste inchangée pour la fiche élève (une seule liste, jamais géante).
   */
  async listPaginated(
    schoolId: string,
    opts: { schoolClassId?: string; search?: string; justified?: boolean; page: number; pageSize: number },
  ) {
    const term = opts.search?.trim();
    const where = {
      justified: opts.justified,
      student: {
        schoolId,
        schoolClassId: opts.schoolClassId,
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
    };

    const [items, total] = await Promise.all([
      this.prisma.absence.findMany({
        where,
        include: { student: true },
        orderBy: { date: 'desc' },
        skip: (opts.page - 1) * opts.pageSize,
        take: opts.pageSize,
      }),
      this.prisma.absence.count({ where }),
    ]);

    return { items, total, page: opts.page, pageSize: opts.pageSize };
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

  /**
   * Justification groupée (dashboard uniquement — DIRECTION/ADMIN, pas de
   * cas d'usage PARENT pour ça). `updateMany` scope directement par école
   * via la relation `student` : un id qui n'appartient pas à l'école ou qui
   * n'existe pas est silencieusement ignoré plutôt que de faire échouer tout
   * le lot, et ne fuite jamais vers une autre école.
   */
  async justifyBulk(absenceIds: string[], schoolId: string, reason: string): Promise<{ count: number }> {
    const result = await this.prisma.absence.updateMany({
      where: { id: { in: absenceIds }, student: { schoolId } },
      data: { justified: true, justificationReason: reason },
    });
    return { count: result.count };
  }
}
