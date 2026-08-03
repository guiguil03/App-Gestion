import { useCallback } from 'react';

import AttendanceRecord, { type Checkpoint } from '@/db/models/AttendanceRecord';
import School from '@/db/models/School';
import Student from '@/db/models/Student';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { isRecordLate } from '@/features/attendance/lateDetection';
import { isWithinScanWindow } from '@/features/attendance/geofence';
import { useSyncStatus } from '@/features/sync/SyncStatusProvider';

export type ScanWindowRejectionReason = 'hors_horaire';

export class ScanWindowRejectionError extends Error {
  constructor(public readonly reason: ScanWindowRejectionReason) {
    super(reason);
  }
}

/**
 * Persists a pointage locally, then kicks off a sync push right away — the
 * automatic triggers (login, network reconnect, app foreground) leave a gap
 * where a teacher who stays on the scan screen for the whole arrival window
 * (never backgrounding the app, never losing network) would have every
 * pointage sit unsynced until one of those triggers happens to fire, even
 * though the dashboard is meant to update live. Best-effort/non-blocking:
 * `triggerSync` already no-ops if a sync is in flight or the device is
 * offline, so calling it after every scan is safe.
 */
export function useRecordAttendance() {
  const database = useOptionalDatabase();
  const { triggerSync } = useSyncStatus();

  return useCallback(
    async (
      studentId: string,
      checkpoint: Checkpoint,
      options?: { isManual?: boolean },
    ): Promise<AttendanceRecord> => {
      if (!database) {
        // Ne devrait jamais être appelé : scan.tsx n'affiche la caméra que
        // lorsque la base est disponible (voir useOptionalDatabase()).
        throw new Error('Base locale indisponible (Expo Go) — un dev client est nécessaire.');
      }
      const student = await database.get<Student>('students').find(studentId);
      const school = await database.get<School>('schools').find(student.schoolId);
      const recordedAt = new Date();

      // Rejet côté appareil = feedback immédiat, y compris hors ligne (voir
      // AttendanceService.recordFromSync côté backend pour la revalidation
      // en défense en profondeur au moment du sync). École sans plage
      // configurée : aucune restriction, comportement inchangé.
      if (school.scanWindowStart && school.scanWindowEnd) {
        if (!isWithinScanWindow(school.scanWindowStart, school.scanWindowEnd, recordedAt)) {
          throw new ScanWindowRejectionError('hors_horaire');
        }
      }

      const isLate = isRecordLate(
        school.attendanceReferenceTime,
        school.attendanceToleranceMinutes,
        recordedAt,
      );

      const record = await database.write(() =>
        database.get<AttendanceRecord>('attendance_records').create((record) => {
          record.studentId = studentId;
          record.checkpoint = checkpoint;
          record.direction = 'entree';
          record.recordedAt = recordedAt;
          record.isLate = isLate;
          record.isManual = options?.isManual ?? false;
        }),
      );
      triggerSync();
      return record;
    },
    [database, triggerSync],
  );
}
