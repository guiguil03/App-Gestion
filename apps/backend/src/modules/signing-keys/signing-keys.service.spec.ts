import { SigningKeysService } from '@/modules/signing-keys/signing-keys.service';

function buildPrisma(overrides: Record<string, any> = {}) {
  return {
    teacherSigningKey: { upsert: jest.fn() },
    ...overrides,
  } as any;
}

describe('SigningKeysService.registerKey', () => {
  it('upserts the teacher signing key keyed by userId', async () => {
    const prisma = buildPrisma();
    prisma.teacherSigningKey.upsert.mockResolvedValue({ userId: 'u1', publicKey: 'pub-hex' });
    const service = new SigningKeysService(prisma);

    const result = await service.registerKey('u1', 'pub-hex');

    expect(prisma.teacherSigningKey.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      create: { userId: 'u1', publicKey: 'pub-hex' },
      update: { publicKey: 'pub-hex' },
    });
    expect(result).toEqual({ userId: 'u1', publicKey: 'pub-hex' });
  });
});
