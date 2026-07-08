import QRCode from 'qrcode';

/**
 * Génère un QR code en SVG brut (chaîne de caractères), pour l'embarquer
 * directement dans un template HTML imprimé via expo-print — pas besoin de
 * canvas/rendu React ici, contrairement à l'écran de session qui utilise
 * react-native-qrcode-svg. Réutilise `qrcode` (déjà une dépendance de
 * react-native-qrcode-svg, déjà éprouvée dans cet environnement RN).
 */
export function buildQrCodeSvg(value: string, size = 240): string {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const count = modules.size;
  const cell = size / count;

  let rects = '';
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (modules.get(row, col)) {
        rects += `<rect x="${(col * cell).toFixed(2)}" y="${(row * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="#000000"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${rects}</svg>`;
}
