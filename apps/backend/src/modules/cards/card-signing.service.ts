import { Injectable } from '@nestjs/common';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';

// @noble/ed25519 v2 ne fournit pas d'implémentation sha512 par défaut
// (tree-shaking) : elle doit être branchée une fois au démarrage. Même
// principe côté mobile (apps/mobile/src/services/qrVerify.ts).
ed.etc.sha512Sync = (...messages) => sha512(ed.etc.concatBytes(...messages));

export type CardPayload = {
  cardId: string;
  studentId: string;
  schoolId: string;
  issuedAt: number;
};

@Injectable()
export class CardSigningService {
  generateKeyPair(): { privateKey: string; publicKey: string } {
    const privateKey = ed.utils.randomPrivateKey();
    const publicKey = ed.getPublicKey(privateKey);
    return {
      privateKey: Buffer.from(privateKey).toString('hex'),
      publicKey: Buffer.from(publicKey).toString('hex'),
    };
  }

  sign(payload: CardPayload, privateKeyHex: string): { payloadBase64: string; signature: string } {
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const message = Buffer.from(payloadBase64, 'utf8');
    const signature = ed.sign(message, Buffer.from(privateKeyHex, 'hex'));
    return { payloadBase64, signature: Buffer.from(signature).toString('base64') };
  }

  /** Format encodé dans le QR : `<payload base64>.<signature base64>`. */
  toQrString(payloadBase64: string, signature: string): string {
    return `${payloadBase64}.${signature}`;
  }
}
