import * as bcrypt from 'bcryptjs';

import { AuthService } from '@/modules/auth/auth.service';

function buildDeps(overrides: Record<string, any> = {}) {
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
    ...overrides,
  } as any;
  const jwt = { sign: jest.fn(), verifyAsync: jest.fn() } as any;
  const service = new AuthService(prisma, jwt);
  return { service, prisma, jwt };
}

describe('AuthService.changePassword', () => {
  it('rejects when the current password is wrong', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    const { service } = buildDeps({
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1', passwordHash }) },
    });

    await expect(service.changePassword('user-1', 'wrong-password', 'new-password')).rejects.toThrow(
      'Mot de passe actuel incorrect',
    );
  });

  it('rejects when the user does not exist', async () => {
    const { service } = buildDeps({ user: { findUnique: jest.fn().mockResolvedValue(null) } });

    await expect(service.changePassword('missing-user', 'anything', 'new-password')).rejects.toThrow(
      'Mot de passe actuel incorrect',
    );
  });

  it('updates the password hash when the current password matches', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    const { service, prisma } = buildDeps({
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1', passwordHash }), update: jest.fn() },
    });

    await service.changePassword('user-1', 'correct-password', 'new-password');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: expect.any(String) },
    });
    const newHash = prisma.user.update.mock.calls[0][0].data.passwordHash;
    expect(await bcrypt.compare('new-password', newHash)).toBe(true);
  });
});
