/**
 * A scan is late once it happens after the school's reference time plus its
 * configurable tolerance window, evaluated on the same calendar day as the
 * scan itself (so this works correctly regardless of the device's date).
 */
export function isRecordLate(
  referenceTime: string,
  toleranceMinutes: number,
  recordedAt: Date,
): boolean {
  const [hours, minutes] = referenceTime.split(':').map(Number);
  const deadline = new Date(recordedAt);
  deadline.setHours(hours, minutes + toleranceMinutes, 0, 0);
  return recordedAt.getTime() > deadline.getTime();
}
