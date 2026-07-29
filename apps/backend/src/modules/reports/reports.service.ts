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
}

function addToSet(map: Map<string, Set<string>>, key: string, value: string): void {
  const set = map.get(key) ?? new Set<string>();
  set.add(value);
  map.set(key, set);
}
