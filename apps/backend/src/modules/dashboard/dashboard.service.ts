import { Injectable } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { PrismaService } from '@/database/prisma.service';
import { AbsenceMarkedEvent, ABSENCE_MARKED_EVENT } from '@/modules/absences/events/absence-marked.event';
import { AttendanceRecordedEvent, ATTENDANCE_RECORDED_EVENT } from '@/modules/attendance/events/attendance-recorded.event';

const REPEATED_LATENESS_THRESHOLD = 3;
const REPEATED_LATENESS_WINDOW_DAYS = 30;

function startOfToday(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly stream$ = new Subject<{ schoolId: string; event: MessageEvent }>();

  streamFor(schoolId: string): Observable<MessageEvent> {
    return this.stream$.asObservable().pipe(
      filter((item) => item.schoolId === schoolId),
      map((item) => item.event),
    );
  }

  @OnEvent(ATTENDANCE_RECORDED_EVENT)
  onAttendanceRecorded(event: AttendanceRecordedEvent): void {
    this.stream$.next({ schoolId: event.schoolId, event: { type: 'attendance.recorded', data: event } });
  }

  @OnEvent(ABSENCE_MARKED_EVENT)
  onAbsenceMarked(event: AbsenceMarkedEvent): void {
    this.stream$.next({ schoolId: event.schoolId, event: { type: 'absence.marked', data: event } });
  }

  async getOverview(schoolId: string) {
    const [totalStudents, records, absentCount] = await Promise.all([
      this.prisma.student.count({ where: { schoolId, deletedAt: null } }),
      this.prisma.attendanceRecord.findMany({
        where: {
          student: { schoolId },
          checkpoint: 'PORTAIL',
          direction: 'ENTREE',
          recordedAt: { gte: startOfToday() },
        },
        select: { studentId: true, isLate: true },
      }),
      this.prisma.absence.count({ where: { student: { schoolId }, date: this.todayKey() } }),
    ]);

    const presentCount = records.length;
    const lateCount = records.filter((r) => r.isLate).length;
    const rate = totalStudents === 0 ? 0 : Math.round((presentCount / totalStudents) * 100);

    return { totalStudents, presentCount, lateCount, absentCount, rate };
  }

  async getClassesComparison(schoolId: string) {
    const classes = await this.prisma.schoolClass.findMany({
      where: { schoolId, deletedAt: null },
      include: { students: { where: { deletedAt: null }, select: { id: true } } },
    });

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        student: { schoolId },
        checkpoint: 'PORTAIL',
        direction: 'ENTREE',
        recordedAt: { gte: startOfToday() },
      },
      select: { studentId: true },
    });
    const presentIds = new Set(records.map((r) => r.studentId));

    return classes.map((schoolClass) => {
      const total = schoolClass.students.length;
      const present = schoolClass.students.filter((s) => presentIds.has(s.id)).length;
      return {
        schoolClassId: schoolClass.id,
        name: schoolClass.name,
        totalStudents: total,
        presentCount: present,
        rate: total === 0 ? 0 : Math.round((present / total) * 100),
      };
    });
  }

  async getAlerts(schoolId: string) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - REPEATED_LATENESS_WINDOW_DAYS);

    const [unjustifiedAbsences, lateGroups] = await Promise.all([
      this.prisma.absence.findMany({
        where: { student: { schoolId }, justified: false },
        include: { student: true },
        orderBy: { date: 'desc' },
        take: 50,
      }),
      this.prisma.attendanceRecord.groupBy({
        by: ['studentId'],
        where: { isLate: true, recordedAt: { gte: cutoff }, student: { schoolId } },
        _count: { studentId: true },
        having: { studentId: { _count: { gte: REPEATED_LATENESS_THRESHOLD } } },
      }),
    ]);

    const lateStudentIds = lateGroups.map((g) => g.studentId);
    const lateStudents = lateStudentIds.length
      ? await this.prisma.student.findMany({ where: { id: { in: lateStudentIds } } })
      : [];
    const lateStudentById = new Map(lateStudents.map((s) => [s.id, s]));

    return {
      unjustifiedAbsences: unjustifiedAbsences.map((absence) => ({
        absenceId: absence.id,
        date: absence.date,
        studentId: absence.student.id,
        firstName: absence.student.firstName,
        lastName: absence.student.lastName,
      })),
      repeatedLateness: lateGroups.map((group) => {
        const student = lateStudentById.get(group.studentId);
        return {
          studentId: group.studentId,
          firstName: student?.firstName ?? '',
          lastName: student?.lastName ?? '',
          lateCount: group._count.studentId,
        };
      }),
    };
  }

  async getTrend(schoolId: string, period: 'week' | 'month') {
    const days = period === 'week' ? 7 : 30;
    const totalStudents = await this.prisma.student.count({ where: { schoolId, deletedAt: null } });

    const points = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const presentCount = await this.prisma.attendanceRecord.count({
        where: {
          student: { schoolId },
          checkpoint: 'PORTAIL',
          direction: 'ENTREE',
          recordedAt: { gte: day, lt: nextDay },
        },
      });

      points.push({
        date: this.todayKey(day),
        rate: totalStudents === 0 ? 0 : Math.round((presentCount / totalStudents) * 100),
      });
    }
    return points;
  }

  private todayKey(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
