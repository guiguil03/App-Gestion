import * as XLSX from 'xlsx';

function normalizeCellValue(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/**
 * Parse un fichier CSV ou Excel (1re feuille) en lignes { entête: valeur }.
 * `cellDates: true` + normalisation post-lecture : une date de naissance
 * saisie dans Excel redevient YYYY-MM-DD quel que soit son format
 * d'affichage local (JJ/MM/AAAA, etc.), le backend n'accepte que l'ISO.
 */
export async function parseImportFile(file: File): Promise<Record<string, string>[]> {
  let workbook: XLSX.WorkBook;
  if (file.name.toLowerCase().endsWith('.csv')) {
    const text = await file.text();
    workbook = XLSX.read(text, { type: 'string' });
  } else {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  }
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];
  const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
  return parsed.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim(), normalizeCellValue(value)])));
}

export function downloadImportTemplate(headers: string[], sampleRow: string[], filename: string): void {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  worksheet['!cols'] = headers.map(() => ({ wch: 22 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Modèle');
  XLSX.writeFile(workbook, filename);
}
