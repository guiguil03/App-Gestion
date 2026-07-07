import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';

import AttendanceRecord, { type Checkpoint } from '@/db/models/AttendanceRecord';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { dateKey, dateLabel } from '@/features/attendance/dateKey';

const HISTORY_WINDOW_DAYS = 30;

export type ChildDayRecord = {
  id: string;
  recordedAt: Date;
  checkpoint: Checkpoint;
  isLate: boolean;
};

export type ChildDaySummary = {
  dateKey: string;
  dateLabel: string;
  status: 'present' | 'late';
  records: ChildDayRecord[];
};

/**
 * Historique jour par jour (30 derniers jours, hors aujourd'hui) pour un
 * enfant. Ne montre que les jours avec au moins un pointage — pas
 * d'inférence d'absence côté parent (nécessiterait un calendrier scolaire,
 * hors scope, cf. spec).
 */
export function useChildHistory(studentId: string | null): ChildDaySummary[] {
  const database = useOptionalDatabase();
  const [days, setDays] = useState<ChildDaySummary[]>([]);

  useEffect(() => {
    if (!database || !studentId) {
      setDays([]);
      return;
    }

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - HISTORY_WINDOW_DAYS);
    windowStart.setHours(0, 0, 0, 0);
    const todayKey = dateKey(new Date());

    const subscription = database
      .get<AttendanceRecord>('attendance_records')
      .query(Q.where('student_id', studentId), Q.where('recorded_at', Q.gte(windowStart.getTime())))
      .observe()
      .subscribe((records) => {
        const byDay = new Map<string, AttendanceRecord[]>();
        for (const record of records) {
          const key = dateKey(record.recordedAt);
          const bucket = byDay.get(key) ?? [];
          bucket.push(record);
          byDay.set(key, bucket);
        }

        const summaries = [...byDay.entries()]
          .filter(([key]) => key !== todayKey)
          .sort(([a], [b]) => (a < b ? 1 : -1))
          .map(([key, dayRecords]) => ({
            dateKey: key,
            dateLabel: dateLabel(dayRecords[0].recordedAt),
            status: (dayRecords.some((record) => record.isLate) ? 'late' : 'present') as 'present' | 'late',
            records: [...dayRecords]
              .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
              .map((record) => ({
                id: record.id,
                recordedAt: record.recordedAt,
                checkpoint: record.checkpoint,
                isLate: record.isLate,
              })),
          }));

        setDays(summaries);
      });

    return () => subscription.unsubscribe();
  }, [database, studentId]);

  return days;
}
