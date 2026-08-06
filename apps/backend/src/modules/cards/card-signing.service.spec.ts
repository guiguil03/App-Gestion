import * as ed from '@noble/ed25519';

import { CardSigningService, type CardPayload } from '@/modules/cards/card-signing.service';

describe('CardSigningService', () => {
  const service = new CardSigningService();

  it('generateKeyPair returns a 32-byte private key and public key, hex-encoded', () => {
    const { privateKey, publicKey } = service.generateKeyPair();

    expect(privateKey).toMatch(/^[0-9a-f]{64}$/);
    expect(publicKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it('sign produces a signature that verifies against the matching public key', async () => {
    const { privateKey, publicKey } = service.generateKeyPair();
    const payload: CardPayload = { cardId: 'card-1', studentId: 'student-1', schoolId: 'school-1', issuedAt: Date.now() };

    const { payloadBase64, signature } = service.sign(payload, privateKey);

    const isValid = await ed.verify(
      Buffer.from(signature, 'base64'),
      Buffer.from(payloadBase64, 'utf8'),
      Buffer.from(publicKey, 'hex'),
    );
    expect(isValid).toBe(true);
    expect(JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'))).toEqual(payload);
  });

  it('sign fails verification against a different public key', async () => {
    const { privateKey } = service.generateKeyPair();
    const { publicKey: otherPublicKey } = service.generateKeyPair();
    const payload: CardPayload = { cardId: 'card-1', studentId: 'student-1', schoolId: 'school-1', issuedAt: Date.now() };

    const { payloadBase64, signature } = service.sign(payload, privateKey);

    const isValid = await ed.verify(
      Buffer.from(signature, 'base64'),
      Buffer.from(payloadBase64, 'utf8'),
      Buffer.from(otherPublicKey, 'hex'),
    );
    expect(isValid).toBe(false);
  });

  it('toQrString joins the base64 payload and signature with a dot', () => {
    expect(service.toQrString('cGF5bG9hZA==', 'c2ln')).toBe('cGF5bG9hZA==.c2ln');
  });
});
