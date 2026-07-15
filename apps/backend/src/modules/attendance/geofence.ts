export type GeoPoint = { lat: number; lng: number };

/**
 * Point-in-polygon par ray casting : compte combien de fois un rayon
 * horizontal partant du point croise les arêtes du polygone. Un nombre
 * impair de croisements signifie que le point est à l'intérieur. Fonctionne
 * pour un polygone simple (non auto-intersectant) à N sommets, ici toujours
 * 4 (les coins du périmètre de l'école) mais l'algorithme n'en dépend pas.
 */
export function isWithinGeofence(corners: GeoPoint[], point: GeoPoint): boolean {
  if (corners.length < 3) return false;

  let inside = false;
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
    const xi = corners[i].lng;
    const yi = corners[i].lat;
    const xj = corners[j].lng;
    const yj = corners[j].lat;

    const intersects = yi > point.lat !== yj > point.lat && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** `now` évalué en heure locale du serveur (voir LateDetectionService — même hypothèse : serveur == fuseau école). */
export function isWithinScanWindow(startTime: string, endTime: string, now: Date): boolean {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= toMinutes(startTime) && nowMinutes <= toMinutes(endTime);
}
