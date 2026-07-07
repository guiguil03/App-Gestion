// apps/mobile/src/features/attendance/hooks/useClassHistory.ts
import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';

import AttendanceRecord, { type Checkpoint } from '@/db/models/AttendanceRecord';
import Student from '@/db/models/Student';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { dateKey, dateLabel } from '@/features/attendance/dateKey';

const HISTORY_WINDOW_DAYS = 30;

export type DayRecord = {
  id: string;
  studentName: string;
  recordedAt: Date;
  checkpoint: Checkpoint;
  isLate: boolean;
};

export type DaySummary = {
  dateKey: string;
  dateLabel: string;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  records: DayRecord[];
};

/** Historique jour par jour (30 derniers jours, hors aujourd'hui) pour une classe. */
export function useClassHistory(classId: string | null): DaySummary[] {
  const database = useOptionalDatabase();
  const [days, setDays] = useState<DaySummary[]>([]);

  useEffect(() => {
    if (!database || !classId) {
      setDays([]);
      return;
    }

    let latestStudents: Student[] = [];
    let latestRecords: AttendanceRecord[] = [];
    let isCancelled = false;
    let recordsSubscription: { unsubscribe: () => void } | null = null;

    function recompute() {
      if (isCancelled) return;
      if (latestStudents.length === 0) {
        setDays([]);
        return;
      }

      const studentNameById = new Map(latestStudents.map((student) => [student.id, student.fullName]));
      const totalStudents = latestStudents.length;
      const todayKey = dateKey(new Date());
      const byDay = new Map<string, AttendanceRecord[]>();

      for (const record of latestRecords) {
        const key = dateKey(record.recordedAt);
        const bucket = byDay.get(key) ?? [];
        bucket.push(record);
        byDay.set(key, bucket);
      }

      const summaries = [...byDay.entries()]
        .filter(([key]) => key !== todayKey)
        .sort(([a], [b]) => (a < b ? 1 : -1))
        .map(([key, records]) => {
          const presentStudentIds = new Set(records.map((record) => record.studentId));
          const lateStudentIds = new Set(
            records.filter((record) => record.isLate).map((record) => record.studentId),
          );

          return {
            dateKey: key,
            dateLabel: dateLabel(records[0].recordedAt),
            presentCount: presentStudentIds.size,
            lateCount: lateStudentIds.size,
            absentCount: totalStudents - presentStudentIds.size,
            records: [...records]
              .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
              .map((record) => ({
                id: record.id,
                studentName: studentNameById.get(record.studentId) ?? 'Élève inconnu',
                recordedAt: record.recordedAt,
                checkpoint: record.checkpoint,
                isLate: record.isLate,
              })),
          };
        });

      setDays(summaries);
    }

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - HISTORY_WINDOW_DAYS);
    windowStart.setHours(0, 0, 0, 0);

    const studentsSubscription = database
      .get<Student>('students')
      .query(Q.where('school_class_id', classId))
      .observe()
      .subscribe((students) => {
        latestStudents = students;
        const studentIds = students.map((student) => student.id);

        recordsSubscription?.unsubscribe();
        recordsSubscription = null;

        if (studentIds.length === 0) {
          latestRecords = [];
          recompute();
          return;
        }

        recordsSubscription = database
          .get<AttendanceRecord>('attendance_records')
          .query(Q.where('student_id', Q.oneOf(studentIds)), Q.where('recorded_at', Q.gte(windowStart.getTime())))
          .observe()
          .subscribe((records) => {
            latestRecords = records;
            recompute();
          });
      });

    return () => {
      isCancelled = true;
      studentsSubscription.unsubscribe();
      recordsSubscription?.unsubscribe();
    };
  }, [database, classId]);

  return days;
}
