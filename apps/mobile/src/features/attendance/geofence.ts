// Miroir de apps/backend/src/modules/attendance/geofence.ts — dupliqué faute
// de package partagé entre les deux codebases, garder les deux en phase.
function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function isWithinScanWindow(startTime: string, endTime: string, now: Date): boolean {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= toMinutes(startTime) && nowMinutes <= toMinutes(endTime);
}
