// apps/mobile/src/features/classes/hooks/useClassRoster.ts
import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';

import AttendanceRecord from '@/db/models/AttendanceRecord';
import Student from '@/db/models/Student';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';

export type RosterStatus = 'present' | 'late' | 'absent';

export type RosterEntry = {
  studentId: string;
  studentName: string;
  status: RosterStatus;
};

/** Élèves d'une classe avec leur statut de présence du jour. */
export function useClassRoster(classId: string | null): RosterEntry[] {
  const database = useOptionalDatabase();
  const [roster, setRoster] = useState<RosterEntry[]>([]);

  useEffect(() => {
    if (!database || !classId) {
      setRoster([]);
      return;
    }

    let latestStudents: Student[] = [];
    let latestRecords: AttendanceRecord[] = [];
    let isCancelled = false;
    let recordsSubscription: { unsubscribe: () => void } | null = null;

    function recompute() {
      if (isCancelled) return;

      const lateStudentIds = new Set(
        latestRecords.filter((record) => record.isLate).map((record) => record.studentId),
      );
      const presentStudentIds = new Set(latestRecords.map((record) => record.studentId));

      const entries = [...latestStudents]
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
        .map((student) => ({
          studentId: student.id,
          studentName: student.fullName,
          status: (lateStudentIds.has(student.id)
            ? 'late'
            : presentStudentIds.has(student.id)
              ? 'present'
              : 'absent') as RosterStatus,
        }));

      setRoster(entries);
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

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

  return roster;
}
