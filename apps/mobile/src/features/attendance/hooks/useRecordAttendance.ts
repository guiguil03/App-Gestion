import { useCallback } from 'react';

import AttendanceRecord, { type Checkpoint } from '@/db/models/AttendanceRecord';
import School from '@/db/models/School';
import Student from '@/db/models/Student';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { isRecordLate } from '@/features/attendance/lateDetection';
import { isWithinGeofence, isWithinScanWindow } from '@/features/attendance/geofence';

export type GeofenceRejectionReason = 'hors_perimetre' | 'hors_horaire' | 'position_indisponible';

export class GeofenceRejectionError extends Error {
  constructor(public readonly reason: GeofenceRejectionReason) {
    super(reason);
  }
}

type Coords = { latitude: number; longitude: number } | null;

/** Persists a pointage locally; the sync engine pushes it to the backend later. */
export function useRecordAttendance() {
  const database = useOptionalDatabase();

  return useCallback(
    async (studentId: string, checkpoint: Checkpoint, coords: Coords): Promise<AttendanceRecord> => {
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
      // en défense en profondeur au moment du sync). École sans périmètre/
      // plage configurés : aucune restriction, comportement inchangé.
      const geofenceCorners = school.geofenceCorners;
      if (geofenceCorners) {
        if (!coords) throw new GeofenceRejectionError('position_indisponible');
        if (!isWithinGeofence(geofenceCorners, { lat: coords.latitude, lng: coords.longitude })) {
          throw new GeofenceRejectionError('hors_perimetre');
        }
      }
      if (school.scanWindowStart && school.scanWindowEnd) {
        if (!isWithinScanWindow(school.scanWindowStart, school.scanWindowEnd, recordedAt)) {
          throw new GeofenceRejectionError('hors_horaire');
        }
      }

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
          if (coords) {
            record.latitude = coords.latitude;
            record.longitude = coords.longitude;
          }
        }),
      );
    },
    [database],
  );
}
