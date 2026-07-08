import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { Buffer } from 'buffer';

import type { SessionPayload } from '@/services/sessionSigning';

// @noble/ed25519 v2 ships without a bundled hash implementation, so it must
// be wired to a concrete sha512 implementation once at startup. Harmless to
// set again here even though qrVerify.ts already does it (same function).
ed.etc.sha512Sync = (...messages) => sha512(ed.etc.concatBytes(...messages));

export type ParsedSession = {
  payload: SessionPayload;
  signature: string;
  payloadBase64: string;
};

const QR_DELIMITER = '.';

/** Parses a raw QR string of the form "<base64 payload>.<base64 signature>". */
export function parseSessionQrCode(raw: string): ParsedSession | null {
  const [payloadBase64, signature] = raw.split(QR_DELIMITER);
  if (!payloadBase64 || !signature) return null;

  try {
    const json = Buffer.from(payloadBase64, 'base64').toString('utf8');
    const payload = JSON.parse(json) as SessionPayload;
    if (!payload.sessionId || !payload.schoolId || !payload.schoolClassId || !payload.teacherId) return null;
    return { payload, signature, payloadBase64 };
  } catch {
    return null;
  }
}

/**
 * Verifies, fully offline, that a scanned session QR was signed by the
 * teacher device's own key (synced down as a `teacher_signing_keys` row for
 * `payload.teacherId`). Does NOT check expiry or duplicate scans — callers
 * must additionally check `payload.expiresAt` and local dedupe by sessionId.
 */
export async function verifySessionSignature(
  parsed: ParsedSession,
  teacherPublicKey: Uint8Array,
): Promise<boolean> {
  const message = new Uint8Array(Buffer.from(parsed.payloadBase64, 'utf8'));
  const signature = new Uint8Array(Buffer.from(parsed.signature, 'base64'));
  return ed.verify(signature, message, teacherPublicKey);
}
