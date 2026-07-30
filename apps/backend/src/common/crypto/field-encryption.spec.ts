import { FieldEncryptionService } from '@/common/crypto/field-encryption';

const TEST_KEY = 'rUR8diTv1ibh3EQjrTlczr1DWUV5aAVduQeB+339dkg=';

describe('FieldEncryptionService', () => {
  const originalEnv = process.env.FIELD_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
  });

  afterAll(() => {
    process.env.FIELD_ENCRYPTION_KEY = originalEnv;
  });

  it('round-trips a plaintext value through encrypt/decrypt', () => {
    const service = new FieldEncryptionService();
    const ciphertext = service.encrypt('+242060000000');

    expect(ciphertext).not.toBe('+242060000000');
    expect(service.decrypt(ciphertext)).toBe('+242060000000');
  });

  it('produces a different ciphertext each time for the same plaintext (random IV)', () => {
    const service = new FieldEncryptionService();
    const a = service.encrypt('+242060000000');
    const b = service.encrypt('+242060000000');

    expect(a).not.toBe(b);
    expect(service.decrypt(a)).toBe('+242060000000');
    expect(service.decrypt(b)).toBe('+242060000000');
  });

  it('passes null/undefined through as null instead of throwing', () => {
    const service = new FieldEncryptionService();
    expect(service.encrypt(null)).toBeNull();
    expect(service.encrypt(undefined)).toBeNull();
    expect(service.decrypt(null)).toBeNull();
    expect(service.decrypt(undefined)).toBeNull();
  });

  it('throws when the auth tag/ciphertext has been tampered with', () => {
    const service = new FieldEncryptionService();
    const ciphertext = service.encrypt('secret');
    const tampered = Buffer.from(ciphertext, 'base64');
    tampered[tampered.length - 1] ^= 0xff;

    expect(() => service.decrypt(tampered.toString('base64'))).toThrow();
  });

  it('throws a clear error when FIELD_ENCRYPTION_KEY is missing', () => {
    delete process.env.FIELD_ENCRYPTION_KEY;
    const service = new FieldEncryptionService();

    expect(() => service.encrypt('value')).toThrow('FIELD_ENCRYPTION_KEY');
  });

  describe('hashForLookup', () => {
    it('is deterministic for the same input', () => {
      const service = new FieldEncryptionService();
      expect(service.hashForLookup('+242060000000')).toBe(service.hashForLookup('+242060000000'));
    });

    it('differs for different inputs', () => {
      const service = new FieldEncryptionService();
      expect(service.hashForLookup('+242060000000')).not.toBe(service.hashForLookup('+242060000001'));
    });

    it('is independent of the encryption key derivation (not equal to a raw encrypt of the same value)', () => {
      const service = new FieldEncryptionService();
      const hash = service.hashForLookup('+242060000000');
      expect(hash).not.toBe(service.encrypt('+242060000000'));
    });
  });
});
