import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { Buffer } from 'buffer';

// @noble/ed25519 v2 ships without a bundled hash implementation, so it must
// be wired to a concrete sha512 implementation once at startup.
ed.etc.sha512Sync = (...messages) => sha512(ed.etc.concatBytes(...messages));

export type CardPayload = {
  cardId: string;
  studentId: string;
  schoolId: string;
  issuedAt: number;
};

export type ParsedCard = {
  payload: CardPayload;
  signature: string;
  payloadBase64: string;
};

const QR_DELIMITER = '.';

/** Parses a raw QR string of the form "<base64 payload>.<base64 signature>". */
export function parseCardQrCode(raw: string): ParsedCard | null {
  const [payloadBase64, signature] = raw.split(QR_DELIMITER);
  if (!payloadBase64 || !signature) return null;

  try {
    const json = Buffer.from(payloadBase64, 'base64').toString('utf8');
    const payload = JSON.parse(json) as CardPayload;
    if (!payload.cardId || !payload.studentId || !payload.schoolId) return null;
    return { payload, signature, payloadBase64 };
  } catch {
    return null;
  }
}

/**
 * Verifies, fully offline, that a scanned card was signed by the school's
 * backend private key. Does NOT check revocation — callers must additionally
 * check `payload.cardId` against the locally synced `revoked_cards` table.
 */
export async function verifyCardSignature(
  parsed: ParsedCard,
  schoolPublicKey: Uint8Array,
): Promise<boolean> {
  const message = new Uint8Array(Buffer.from(parsed.payloadBase64, 'utf8'));
  const signature = new Uint8Array(Buffer.from(parsed.signature, 'base64'));
  return ed.verify(signature, message, schoolPublicKey);
}
