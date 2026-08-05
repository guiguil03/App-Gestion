import { schoolLocalMinutes } from '@/features/attendance/geofence';

/**
 * A scan is late once it happens after the school's reference time plus its
 * configurable tolerance window, evaluated in the school's own timezone
 * (Africa/Brazzaville) rather than the device's — this is only immediate
 * on-device feedback anyway (the server recalculates authoritatively, see
 * AttendanceService.recordFromSync), but a phone set to a different
 * timezone (e.g. a developer testing from France) must still show the same
 * "late" verdict the server will end up recording, not a device-local one.
 */
export function isRecordLate(
  referenceTime: string,
  toleranceMinutes: number,
  recordedAt: Date,
): boolean {
  const [hours, minutes] = referenceTime.split(':').map(Number);
  return schoolLocalMinutes(recordedAt) > hours * 60 + minutes + toleranceMinutes;
}
