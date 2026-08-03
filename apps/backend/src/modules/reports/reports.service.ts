import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';
import { dateKey } from '@/modules/absences/date-key';

export type StudentAttendanceSummary = {
  student: {
    id: string;
    lastName: string;
    middleName: string | null;
    firstName: string;
    schoolClass: { id: string; name: string; promotion: string };
  };
  presencesCount: number;
  lateCount: number;
  absencesJustifiedCount: number;
  absencesUnjustifiedCount: number;
};

export type AttendanceHistoryStatus = 'PRESENT' | 'LATE' | 'ABSENT';

export type AttendanceHistoryEntry = {
  student: {
    id: string;
    lastName: string;
    middleName: string | null;
    firstName: string;
    schoolClass: { id: string; name: string; promotion: string };
  };
  date: string;
  status: AttendanceHistoryStatus;
  justified: boolean | null;
  justificationReason: string | null;
  recordedAt: string | null;
};

export type AttendanceHistoryFilters = {
  schoolClassId?: string;
  studentId?: string;
  status?: 'present' | 'late' | 'absent';
  startDate: string;
  endDate: string;
};

type StudentRef = AttendanceHistoryEntry['student'];

type RawAttendanceRecord = {
  studentId: string;
  recordedAt: Date;
  isLate: boolean;
  student: {
    id: string;
    lastName: string;
    middleName: string | null;
    firstName: string;
    schoolClass: { id: string; name: string; promotion: string };
  };
};

type RawAbsence = {
  studentId: string;
  date: string;
  justified: boolean;
  justificationReason: string | null;
  student: RawAttendanceRecord['student'];
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Résumé par élève (présences/retards/absences) sur une période — §3.6 du
   * cahier des charges (rapports exportables par classe/période/école).
   * Une présence = un jour avec au moins un pointage PORTAIL/ENTREE, même
   * définition que AbsencesService.detectAbsences.
   */
  async attendanceSummary(
    schoolId: string,
    schoolClassId: string | undefined,
    startDate: string,
    endDate: string,
  ): Promise<StudentAttendanceSummary[]> {
    const students = await this.prisma.student.findMany({
      where: { schoolId, schoolClassId, deletedAt: null },
      include: { schoolClass: true },
      orderBy: [{ schoolClass: { name: 'asc' } }, { lastName: 'asc' }, { firstName: 'asc' }],
    });

    const startOfRange = new Date(`${startDate}T00:00:00`);
    const endOfRange = new Date(`${endDate}T23:59:59.999`);

    const [attendanceRecords, absences] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: {
          student: { schoolId, schoolClassId },
          checkpoint: 'PORTAIL',
          direction: 'ENTREE',
          recordedAt: { gte: startOfRange, lte: endOfRange },
        },
        select: { studentId: true, recordedAt: true, isLate: true },
      }),
      this.prisma.absence.findMany({
        where: { student: { schoolId, schoolClassId }, date: { gte: startDate, lte: endDate } },
        select: { studentId: true, justified: true },
      }),
    ]);

    const presenceDaysByStudent = new Map<string, Set<string>>();
    const lateDaysByStudent = new Map<string, Set<string>>();
    for (const record of attendanceRecords) {
      const day = dateKey(record.recordedAt);
      addToSet(presenceDaysByStudent, record.studentId, day);
      if (record.isLate) addToSet(lateDaysByStudent, record.studentId, day);
    }

    const justifiedByStudent = new Map<string, number>();
    const unjustifiedByStudent = new Map<string, number>();
    for (const absence of absences) {
      const target = absence.justified ? justifiedByStudent : unjustifiedByStudent;
      target.set(absence.studentId, (target.get(absence.studentId) ?? 0) + 1);
    }

    return students.map((student) => ({
      student: {
        id: student.id,
        lastName: student.lastName,
        middleName: student.middleName,
        firstName: student.firstName,
        schoolClass: {
          id: student.schoolClass.id,
          name: student.schoolClass.name,
          promotion: student.schoolClass.promotion,
        },
      },
      presencesCount: presenceDaysByStudent.get(student.id)?.size ?? 0,
      lateCount: lateDaysByStudent.get(student.id)?.size ?? 0,
      absencesJustifiedCount: justifiedByStudent.get(student.id) ?? 0,
      absencesUnjustifiedCount: unjustifiedByStudent.get(student.id) ?? 0,
    }));
  }

  /**
   * Historique jour par jour (présent/en retard/absent) — §3.6 du cahier des
   * charges ("historique complet... filtres par date, classe, élève ou
   * statut"). Une ligne par (élève, jour) où quelque chose s'est produit :
   * un pointage PORTAIL/ENTREE ce jour-là, ou une absence enregistrée. Pas
   * de ligne fabriquée pour les jours sans donnée (week-ends, etc.).
   */
  async attendanceHistory(schoolId: string, filters: AttendanceHistoryFilters): Promise<AttendanceHistoryEntry[]> {
    const { schoolClassId, studentId, status, startDate, endDate } = filters;
    const startOfRange = new Date(`${startDate}T00:00:00`);
    const endOfRange = new Date(`${endDate}T23:59:59.999`);

    const [attendanceRecords, absences] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: {
          student: { schoolId, schoolClassId, id: studentId, deletedAt: null },
          checkpoint: 'PORTAIL',
          direction: 'ENTREE',
          recordedAt: { gte: startOfRange, lte: endOfRange },
        },
        select: {
          studentId: true,
          recordedAt: true,
          isLate: true,
          student: { include: { schoolClass: true } },
        },
        orderBy: { recordedAt: 'asc' },
      }),
      this.prisma.absence.findMany({
        where: {
          student: { schoolId, schoolClassId, id: studentId, deletedAt: null },
          date: { gte: startDate, lte: endDate },
        },
        select: {
          studentId: true,
          date: true,
          justified: true,
          justificationReason: true,
          student: { include: { schoolClass: true } },
        },
      }),
    ]);

    const wantedStatus = status ? (status.toUpperCase() as AttendanceHistoryStatus) : undefined;
    const rows = buildHistoryRows(attendanceRecords, absences).filter(
      (row) => !wantedStatus || row.status === wantedStatus,
    );
    return sortHistoryRows(rows);
  }

  /**
   * Historique jour par jour, scopé aux seuls enfants d'un compte PARENT
   * (résolus via `ParentGuardian.userId`) — variante de `attendanceHistory`
   * pour le rapport mensuel exportable côté mobile parent. Contrairement à
   * `attendanceHistory` (DIRECTION/ADMIN), aucun `studentId`/`schoolClassId`
   * arbitraire n'est accepté en entrée : la liste d'enfants vient uniquement
   * de la relation ParentGuardian → évite qu'un parent puisse interroger les
   * données d'un autre élève en devinant un id.
   */
  async myChildrenHistory(
    schoolId: string,
    userId: string,
    filters: { startDate: string; endDate: string },
  ): Promise<AttendanceHistoryEntry[]> {
    const guardianRows = await this.prisma.parentGuardian.findMany({
      where: { userId },
      select: { studentId: true },
    });
    const studentIds = [...new Set(guardianRows.map((row) => row.studentId))];
    if (studentIds.length === 0) return [];

    const { startDate, endDate } = filters;
    const startOfRange = new Date(`${startDate}T00:00:00`);
    const endOfRange = new Date(`${endDate}T23:59:59.999`);

    const [attendanceRecords, absences] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: {
          student: { schoolId, id: { in: studentIds }, deletedAt: null },
          checkpoint: 'PORTAIL',
          direction: 'ENTREE',
          recordedAt: { gte: startOfRange, lte: endOfRange },
        },
        select: {
          studentId: true,
          recordedAt: true,
          isLate: true,
          student: { include: { schoolClass: true } },
        },
        orderBy: { recordedAt: 'asc' },
      }),
      this.prisma.absence.findMany({
        where: {
          student: { schoolId, id: { in: studentIds }, deletedAt: null },
          date: { gte: startDate, lte: endDate },
        },
        select: {
          studentId: true,
          date: true,
          justified: true,
          justificationReason: true,
          student: { include: { schoolClass: true } },
        },
      }),
    ]);

    return sortHistoryRows(buildHistoryRows(attendanceRecords, absences));
  }
}

function addToSet(map: Map<string, Set<string>>, key: string, value: string): void {
  const set = map.get(key) ?? new Set<string>();
  set.add(value);
  map.set(key, set);
}

function toStudentRef(student: RawAttendanceRecord['student']): StudentRef {
  return {
    id: student.id,
    lastName: student.lastName,
    middleName: student.middleName,
    firstName: student.firstName,
    schoolClass: { id: student.schoolClass.id, name: student.schoolClass.name, promotion: student.schoolClass.promotion },
  };
}

/**
 * Fusionne pointages + absences bruts en lignes (élève, jour) — partagé par
 * `attendanceHistory` et `myChildrenHistory`, qui ne diffèrent que par la
 * façon dont ils scopent/filtrent les requêtes Prisma en amont.
 */
function buildHistoryRows(
  attendanceRecords: RawAttendanceRecord[],
  absences: RawAbsence[],
): AttendanceHistoryEntry[] {
  const byKey = new Map<string, AttendanceHistoryEntry>();

  // Pointages : on garde le premier de la journée (recordedAt asc en amont).
  for (const record of attendanceRecords) {
    const day = dateKey(record.recordedAt);
    const key = `${record.studentId}|${day}`;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      student: toStudentRef(record.student),
      date: day,
      status: record.isLate ? 'LATE' : 'PRESENT',
      justified: null,
      justificationReason: null,
      recordedAt: record.recordedAt.toISOString(),
    });
  }

  // Les absences priment sur un éventuel pointage (ne devrait pas coexister en pratique).
  for (const absence of absences) {
    const key = `${absence.studentId}|${absence.date}`;
    byKey.set(key, {
      student: toStudentRef(absence.student),
      date: absence.date,
      status: 'ABSENT',
      justified: absence.justified,
      justificationReason: absence.justificationReason,
      recordedAt: null,
    });
  }

  return [...byKey.values()];
}

function sortHistoryRows(rows: AttendanceHistoryEntry[]): AttendanceHistoryEntry[] {
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.student.lastName.localeCompare(b.student.lastName);
  });
}
