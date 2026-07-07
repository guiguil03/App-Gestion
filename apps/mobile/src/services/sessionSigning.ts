import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { Buffer } from 'buffer';

import { getDeviceSigningPrivateKey, saveDeviceSigningPrivateKey } from '@/services/secureStorage';

// @noble/ed25519 v2 ships without a bundled hash implementation, so it must
// be wired to a concrete sha512 implementation once at startup. Harmless to
// set again here even though qrVerify.ts already does it (same function).
ed.etc.sha512Sync = (...messages) => sha512(ed.etc.concatBytes(...messages));

export type SessionPayload = {
  sessionId: string;
  schoolId: string;
  schoolClassId: string;
  teacherId: string;
  openedAt: number;
  expiresAt: number;
};

/**
 * La clé privée de CET appareil enseignant, générée une seule fois et
 * jamais transmise nulle part (seule la clé publique l'est, via
 * /signing-keys) — symétrique à School.cardSigningPrivateKey côté backend,
 * qui elle ne quitte jamais le serveur.
 */
export async function getOrCreateDeviceKeyPair(): Promise<{ privateKey: Uint8Array; publicKeyHex: string }> {
  const existingHex = await getDeviceSigningPrivateKey();
  if (existingHex) {
    const privateKey = new Uint8Array(Buffer.from(existingHex, 'hex'));
    return { privateKey, publicKeyHex: Buffer.from(ed.getPublicKey(privateKey)).toString('hex') };
  }

  const privateKey = ed.utils.randomPrivateKey();
  await saveDeviceSigningPrivateKey(Buffer.from(privateKey).toString('hex'));
  return { privateKey, publicKeyHex: Buffer.from(ed.getPublicKey(privateKey)).toString('hex') };
}

/** Format encodé dans le QR : `<payload base64>.<signature base64>` (même format que les cartes élèves). */
export async function signSessionPayload(payload: SessionPayload): Promise<{ qrCode: string; publicKeyHex: string }> {
  const { privateKey, publicKeyHex } = await getOrCreateDeviceKeyPair();
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  const message = new Uint8Array(Buffer.from(payloadBase64, 'utf8'));
  const signature = ed.sign(message, privateKey);
  return { qrCode: `${payloadBase64}.${Buffer.from(signature).toString('base64')}`, publicKeyHex };
}
