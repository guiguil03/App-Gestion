// apps/mobile/src/services/cardHtml.ts
/**
 * Gabarit HTML de la carte élève imprimable (via expo-print), aligné sur le
 * visuel utilisé par l'export du dashboard web (StudentCardVisual) : bandeau
 * dégradé avec branding + n° de carte, photo/initiale, badge classe, grille
 * naissance/sexe, QR avec légende, pied de page avec date d'émission.
 * Dimensions conservées au format carte physique (243×153pt) plutôt que le
 * format plus large utilisé pour l'export PDF du dashboard (pensé pour
 * l'écran, pas pour être glissé dans un porte-carte).
 */

export type CardData = {
  fullName: string;
  className: string;
  promotion: string;
  dateOfBirth: string;
  sex: string;
  photoUrl: string | null;
  qrSvg: string;
  cardId: string;
  issuedAt: string;
};

const CARD_STYLES = `
  .card {
    width: 243pt; height: 153pt; box-sizing: border-box;
    display: flex; flex-direction: column; overflow: hidden;
    border: 1pt solid #E4E4E7; border-radius: 10pt;
  }
  .header {
    flex-shrink: 0; box-sizing: border-box;
    display: flex; align-items: center; justify-content: space-between;
    padding: 5pt 9pt;
    background: linear-gradient(to right, #059669, #0d9488);
  }
  .brand { line-height: 1.1; }
  .brand .eyebrow { font-size: 5.5pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; color: rgba(255,255,255,0.8); margin: 0; }
  .brand .title { font-size: 8pt; font-weight: 700; color: #ffffff; margin: 1pt 0 0; }
  .card-number { font-family: 'Courier New', monospace; font-size: 6.5pt; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0; }
  .body {
    flex: 1; box-sizing: border-box;
    display: flex; align-items: stretch; gap: 8pt;
    padding: 7pt 9pt;
  }
  .photo { width: 44pt; height: 56pt; object-fit: cover; border-radius: 5pt; background: #ECFDF5; flex-shrink: 0; }
  .initial {
    width: 44pt; height: 56pt; border-radius: 5pt; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: #ECFDF5; color: #059669; font-size: 16pt; font-weight: 700;
  }
  .info { flex: 1; min-width: 0; }
  .name { font-size: 9.5pt; font-weight: 700; color: #18181B; margin: 0; line-height: 1.2; }
  .class-pill {
    display: inline-block; margin-top: 3pt; padding: 1.5pt 6pt;
    border-radius: 8pt; background: #ECFDF5; color: #047857;
    font-size: 6.5pt; font-weight: 600;
  }
  .grid {
    display: flex; gap: 10pt; margin-top: 6pt; padding-top: 5pt;
    border-top: 0.5pt solid #F1F5F9;
  }
  .grid .label { font-size: 5.5pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3pt; color: #A1A1AA; margin: 0; }
  .grid .value { font-size: 7pt; font-weight: 500; color: #3F3F46; margin: 1pt 0 0; }
  .qr-block { width: 50pt; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2pt; }
  .qr-frame { width: 46pt; height: 46pt; border: 0.5pt solid #E4E4E7; border-radius: 4pt; box-sizing: border-box; padding: 2pt; }
  .qr-caption { font-size: 4.5pt; text-transform: uppercase; letter-spacing: 0.3pt; color: #A1A1AA; text-align: center; margin: 0; }
  .footer {
    flex-shrink: 0; box-sizing: border-box;
    display: flex; align-items: center; justify-content: space-between;
    padding: 3pt 9pt; background: #FAFAFA; border-top: 0.5pt solid #F1F5F9;
  }
  .footer p { font-size: 5pt; color: #A1A1AA; margin: 0; }
`;

function renderCardBlock(data: CardData): string {
  const cardNumber = data.cardId.replace(/-/g, '').slice(0, 8).toUpperCase();
  const formattedBirth = formatDate(data.dateOfBirth);
  const formattedIssued = formatDate(data.issuedAt);
  const initial = data.fullName.charAt(0).toUpperCase();

  return `
    <div class="card">
      <div class="header">
        <div class="brand">
          <p class="eyebrow">Présence Scolaire</p>
          <p class="title">Carte élève</p>
        </div>
        <p class="card-number">N° ${cardNumber}</p>
      </div>

      <div class="body">
        ${data.photoUrl ? `<img class="photo" src="${data.photoUrl}" />` : `<div class="initial">${initial}</div>`}
        <div class="info">
          <p class="name">${data.fullName}</p>
          <span class="class-pill">${data.className} · ${data.promotion}</span>
          <div class="grid">
            <div>
              <p class="label">Né(e) le</p>
              <p class="value">${formattedBirth}</p>
            </div>
            <div>
              <p class="label">Sexe</p>
              <p class="value">${data.sex === 'F' ? 'Féminin' : 'Masculin'}</p>
            </div>
          </div>
        </div>
        <div class="qr-block">
          <div class="qr-frame">${data.qrSvg}</div>
          <p class="qr-caption">Scanner au portail</p>
        </div>
      </div>

      <div class="footer">
        <p>Émise le ${formattedIssued}</p>
        <p>presencescolaire.app</p>
      </div>
    </div>
  `;
}

/** Une seule carte — impression/export individuel depuis la fiche élève. */
export function buildCardHtml(data: CardData): string {
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { margin: 0; }
          body { margin: 0; font-family: -apple-system, Helvetica, Arial, sans-serif; }
          ${CARD_STYLES}
        </style>
      </head>
      <body>
        ${renderCardBlock(data)}
      </body>
    </html>
  `;
}

/**
 * Plusieurs cartes, une par page (même format physique 243×153pt chacune) —
 * impression en lot depuis la liste élèves. `page-break-after` sépare
 * chaque carte pour qu'elle sorte sur sa propre page/découpe à l'impression.
 */
export function buildBatchCardHtml(cards: CardData[]): string {
  const pages = cards
    .map((data, index) => {
      const isLast = index === cards.length - 1;
      return `<div class="page"${isLast ? '' : ' style="page-break-after: always;"'}>${renderCardBlock(data)}</div>`;
    })
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { margin: 0; }
          body { margin: 0; font-family: -apple-system, Helvetica, Arial, sans-serif; }
          .page { width: 243pt; height: 153pt; }
          ${CARD_STYLES}
        </style>
      </head>
      <body>
        ${pages}
      </body>
    </html>
  `;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-FR');
}
