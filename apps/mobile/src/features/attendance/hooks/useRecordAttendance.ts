import { useCallback } from 'react';

import AttendanceRecord, { type Checkpoint } from '@/db/models/AttendanceRecord';
import School from '@/db/models/School';
import Student from '@/db/models/Student';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { isRecordLate } from '@/features/attendance/lateDetection';

/** Persists a pointage locally; the sync engine pushes it to the backend later. */
export function useRecordAttendance() {
  const database = useOptionalDatabase();

  return useCallback(
    async (studentId: string, checkpoint: Checkpoint): Promise<AttendanceRecord> => {
      if (!database) {
        // Ne devrait jamais être appelé : scan.tsx n'affiche la caméra que
        // lorsque la base est disponible (voir useOptionalDatabase()).
        throw new Error('Base locale indisponible (Expo Go) — un dev client est nécessaire.');
      }
      const student = await database.get<Student>('students').find(studentId);
      const school = await database.get<School>('schools').find(student.schoolId);
      const recordedAt = new Date();
      const isLate = isRecordLate(
        school.attendanceReferenceTime,
        school.attendanceToleranceMinutes,
        recordedAt,
      );

      return database.write(() =>
        database.get<AttendanceRecord>('attendance_records').create((record) => {
          record.studentId = studentId;
          record.checkpoint = checkpoint;
          record.direction = 'entree';
          record.recordedAt = recordedAt;
          record.isLate = isLate;
        }),
      );
    },
    [database],
  );
}
