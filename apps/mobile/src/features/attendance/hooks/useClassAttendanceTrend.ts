import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';

import AttendanceRecord from '@/db/models/AttendanceRecord';
import Student from '@/db/models/Student';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { dateKey } from '@/features/attendance/dateKey';

const TREND_WINDOW_DAYS = 14;

export type TrendPoint = {
  dateKey: string;
  presenceRate: number; // 0–100
};

/** Taux de présence (%) par jour sur les 14 derniers jours pour une classe. */
export function useClassAttendanceTrend(classId: string | null): TrendPoint[] {
  const database = useOptionalDatabase();
  const [trend, setTrend] = useState<TrendPoint[]>([]);

  useEffect(() => {
    if (!database || !classId) {
      setTrend([]);
      return;
    }

    let latestStudents: Student[] = [];
    let latestRecords: AttendanceRecord[] = [];
    let isCancelled = false;
    let recordsSubscription: { unsubscribe: () => void } | null = null;

    function recompute() {
      if (isCancelled) return;
      if (latestStudents.length === 0) {
        setTrend([]);
        return;
      }

      const totalStudents = latestStudents.length;
      const presentStudentIdsByDay = new Map<string, Set<string>>();

      for (const record of latestRecords) {
        const key = dateKey(record.recordedAt);
        const bucket = presentStudentIdsByDay.get(key) ?? new Set<string>();
        bucket.add(record.studentId);
        presentStudentIdsByDay.set(key, bucket);
      }

      const points: TrendPoint[] = [];
      for (let dayOffset = TREND_WINDOW_DAYS - 1; dayOffset >= 0; dayOffset--) {
        const day = new Date();
        day.setDate(day.getDate() - dayOffset);
        const key = dateKey(day);
        const presentCount = presentStudentIdsByDay.get(key)?.size ?? 0;
        points.push({ dateKey: key, presenceRate: (presentCount / totalStudents) * 100 });
      }

      setTrend(points);
    }

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - (TREND_WINDOW_DAYS - 1));
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

  return trend;
}
