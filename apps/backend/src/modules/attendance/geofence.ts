function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** `now` évalué en heure locale du serveur (voir LateDetectionService — même hypothèse : serveur == fuseau école). */
export function isWithinScanWindow(startTime: string, endTime: string, now: Date): boolean {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= toMinutes(startTime) && nowMinutes <= toMinutes(endTime);
}
