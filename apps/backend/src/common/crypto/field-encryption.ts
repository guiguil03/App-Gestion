import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function baseKey(): Buffer {
  const value = process.env.FIELD_ENCRYPTION_KEY;
  if (!value) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY manquante — requise pour chiffrer/déchiffrer les données personnelles (téléphone, adresse). Voir .env.example.',
    );
  }
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) {
    throw new Error('FIELD_ENCRYPTION_KEY doit être une clé de 32 octets encodée en base64 (ex. openssl rand -base64 32).');
  }
  return key;
}

// Deux sous-clés dérivées d'un seul secret (HMAC-based key derivation) :
// une pour le chiffrement, une pour le hash de recherche déterministe —
// évite de faire gérer deux secrets séparés à l'exploitant.
function deriveKey(label: string): Buffer {
  return createHmac('sha256', baseKey()).update(label).digest();
}

/**
 * Chiffrement applicatif des données personnelles sensibles (téléphone,
 * adresse — §4 du cahier des charges) — vient s'ajouter au chiffrement au
 * repos déjà assuré par l'hébergeur (Supabase), pas le remplacer. AES-256-GCM
 * avec IV aléatoire par valeur : deux chiffrements de la même donnée
 * produisent des sorties différentes (non déterministe), donc impossible à
 * utiliser tel quel pour une recherche exacte en base — voir `hashForLookup`
 * pour ce cas (utilisé par StudentsService.provisionParentAccount pour
 * retrouver un compte parent existant par numéro de téléphone).
 */
@Injectable()
export class FieldEncryptionService {
  encrypt(plaintext: string): string;
  encrypt(plaintext: string | null | undefined): string | null;
  encrypt(plaintext: string | null | undefined): string | null {
    if (plaintext === null || plaintext === undefined) return null;

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, deriveKey('field-encryption:aes'), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
  }

  decrypt(value: string): string;
  decrypt(value: string | null | undefined): string | null;
  decrypt(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;

    const raw = Buffer.from(value, 'base64');
    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, deriveKey('field-encryption:aes'), iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  /** Hash déterministe (HMAC-SHA256, hex) — index de recherche exacte, jamais utilisé seul pour retrouver la valeur en clair. */
  hashForLookup(plaintext: string): string {
    return createHmac('sha256', deriveKey('field-encryption:hmac')).update(plaintext).digest('hex');
  }
}
