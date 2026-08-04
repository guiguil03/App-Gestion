// Miroir de apps/backend/src/modules/attendance/geofence.ts — dupliqué faute
// de package partagé entre les deux codebases, garder les deux en phase.
//
// Contrairement à la version backend (qui s'appuie sur le fuseau horaire du
// serveur, configuré une fois via TZ), on force ici un fuseau explicite :
// un téléphone peut être réglé sur n'importe quel fuseau (ex. développeur
// testant depuis la France), et `Date.getHours()` lirait alors l'heure de
// CE fuseau plutôt que celle de l'école. La plage de pointage doit refléter
// l'heure réelle de l'école, indépendamment du réglage de l'appareil.
const SCHOOL_TIME_ZONE = 'Africa/Brazzaville';

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function schoolLocalMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: SCHOOL_TIME_ZONE,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(now);
  const hours = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minutes = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hours * 60 + minutes;
}

export function isWithinScanWindow(startTime: string, endTime: string, now: Date): boolean {
  const nowMinutes = schoolLocalMinutes(now);
  return nowMinutes >= toMinutes(startTime) && nowMinutes <= toMinutes(endTime);
}
