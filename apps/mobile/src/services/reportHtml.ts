// apps/mobile/src/services/reportHtml.ts
/**
 * Gabarit HTML pour les rapports exportés en PDF (via expo-print) — tableau
 * paginé générique, réutilisé par le rapport mensuel parent et le rapport de
 * présence direction. Contrairement à cardHtml.ts (dimensions figées d'une
 * carte physique), ce gabarit laisse expo-print choisir un format page
 * standard, plus adapté à un document texte multi-lignes.
 */
export function buildReportHtml({
  title,
  subtitle,
  columns,
  rows,
}: {
  title: string;
  subtitle: string;
  columns: string[];
  rows: string[][];
}): string {
  const headerCells = columns.map((col) => `<th>${escapeHtml(col)}</th>`).join('');
  const bodyRows = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { margin: 28pt; }
          body { margin: 0; font-family: -apple-system, Helvetica, Arial, sans-serif; color: #18181B; }
          .header {
            display: flex; align-items: center; justify-content: space-between;
            padding-bottom: 10pt; margin-bottom: 14pt; border-bottom: 2pt solid #059669;
          }
          .brand { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5pt; color: #059669; margin: 0; }
          h1 { font-size: 15pt; font-weight: 700; margin: 3pt 0 0; }
          .subtitle { font-size: 9pt; color: #71717A; margin: 0; text-align: right; }
          table { width: 100%; border-collapse: collapse; }
          th {
            text-align: left; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.3pt;
            color: #71717A; padding: 5pt 6pt; border-bottom: 1pt solid #E4E4E7;
          }
          td { font-size: 9pt; padding: 5pt 6pt; border-bottom: 0.5pt solid #F1F5F9; }
          tr:nth-child(even) td { background: #FAFAFA; }
          .empty { padding: 20pt 6pt; text-align: center; color: #A1A1AA; font-size: 9pt; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <p class="brand">Présence Scolaire</p>
            <h1>${escapeHtml(title)}</h1>
          </div>
          <p class="subtitle">${escapeHtml(subtitle)}</p>
        </div>
        ${
          rows.length === 0
            ? '<p class="empty">Aucune donnée sur cette période.</p>'
            : `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`
        }
      </body>
    </html>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
