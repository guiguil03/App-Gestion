import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';

import AttendanceRecord, { type Checkpoint } from '@/db/models/AttendanceRecord';
import Student from '@/db/models/Student';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';

export type RecentAttendanceRecord = {
  id: string;
  studentName: string;
  recordedAt: Date;
  checkpoint: Checkpoint;
  isLate: boolean;
};

export type ClassAttendanceSummary = {
  totalCount: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  recentRecords: RecentAttendanceRecord[];
};

const EMPTY_SUMMARY: ClassAttendanceSummary = {
  totalCount: 0,
  presentCount: 0,
  lateCount: 0,
  absentCount: 0,
  recentRecords: [],
};

const MAX_RECENT_RECORDS = 20;

/** Résumé de présence du jour pour une classe : élèves de la classe croisés avec leurs pointages depuis minuit. */
export function useClassAttendanceSummary(classId: string | null): ClassAttendanceSummary {
  const database = useOptionalDatabase();
  const [summary, setSummary] = useState<ClassAttendanceSummary>(EMPTY_SUMMARY);

  useEffect(() => {
    if (!database || !classId) {
      setSummary(EMPTY_SUMMARY);
      return;
    }

    let latestStudents: Student[] = [];
    let latestRecords: AttendanceRecord[] = [];
    let isCancelled = false;

    function recompute() {
      if (isCancelled) return;

      if (latestStudents.length === 0) {
        setSummary(EMPTY_SUMMARY);
        return;
      }

      const studentNameById = new Map(latestStudents.map((student) => [student.id, student.fullName]));
      const presentStudentIds = new Set(latestRecords.map((record) => record.studentId));
      const lateStudentIds = new Set(
        latestRecords.filter((record) => record.isLate).map((record) => record.studentId),
      );
      const recentRecords = [...latestRecords]
        .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
        .slice(0, MAX_RECENT_RECORDS)
        .map((record) => ({
          id: record.id,
          studentName: studentNameById.get(record.studentId) ?? 'Élève inconnu',
          recordedAt: record.recordedAt,
          checkpoint: record.checkpoint,
          isLate: record.isLate,
        }));

      setSummary({
        totalCount: latestStudents.length,
        presentCount: presentStudentIds.size,
        lateCount: lateStudentIds.size,
        absentCount: latestStudents.length - presentStudentIds.size,
        recentRecords,
      });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let recordsSubscription: { unsubscribe: () => void } | null = null;

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
          .query(Q.where('student_id', Q.oneOf(studentIds)), Q.where('recorded_at', Q.gte(startOfDay.getTime())))
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

  return summary;
}
