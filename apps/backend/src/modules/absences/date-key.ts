/**
 * Clé de date locale ("YYYY-MM-DD") utilisée par `Absence.date`. Basée sur
 * les composants locaux de `Date` (pas `toISOString`, qui est en UTC) pour
 * rester cohérente avec `LateDetectionService`, qui suppose déjà que
 * l'heure serveur == l'heure de l'école (voir late-detection.service.ts).
 */
export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
