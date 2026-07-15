// Détecte le vrai type d'une image à partir de sa signature binaire (magic
// bytes), plutôt que de faire confiance à l'extension du nom de fichier ou au
// Content-Type déclaré par le client — tous deux falsifiables. Un fichier
// renommé en "photo.jpg" dont le contenu réel n'est pas une image JPEG/PNG
// est ainsi rejeté avant d'atteindre le disque.
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function matchesSignature(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, index) => buffer[index] === byte);
}

export function detectImageExtension(buffer: Buffer): '.jpg' | '.png' | null {
  if (matchesSignature(buffer, PNG_SIGNATURE)) return '.png';
  if (matchesSignature(buffer, JPEG_SIGNATURE)) return '.jpg';
  return null;
}
