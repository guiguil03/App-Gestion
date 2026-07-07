// apps/mobile/src/features/attendance/dateKey.ts

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** Clé de jour calendaire en heure locale (évite les décalages UTC de `toISOString`). */
export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Ex. "Lundi 6 juillet". */
export function dateLabel(date: Date): string {
  const label = DAY_LABEL_FORMATTER.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
