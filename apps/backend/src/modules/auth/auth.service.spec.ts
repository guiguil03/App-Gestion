import * as bcrypt from 'bcryptjs';

import { AuthService } from '@/modules/auth/auth.service';
import { LoginThrottleService } from '@/modules/auth/login-throttle.service';

function buildDeps(overrides: Record<string, any> = {}) {
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
    ...overrides,
  } as any;
  const jwt = { sign: jest.fn(), verifyAsync: jest.fn() } as any;
  const audit = { log: jest.fn() } as any;
  const loginThrottle = new LoginThrottleService();
  const service = new AuthService(prisma, jwt, audit, loginThrottle);
  return { service, prisma, jwt, audit, loginThrottle };
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
    const { service, prisma, jwt } = buildDeps({
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', passwordHash }),
        update: jest.fn().mockResolvedValue({
          id: 'user-1',
          username: 'direction1',
          role: 'DIRECTION',
          schoolId: 'school-1',
          studentId: null,
          mustChangePassword: false,
        }),
      },
    });
    jwt.sign.mockReturnValue('token');

    await service.changePassword('user-1', 'correct-password', 'new-password');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: expect.any(String), mustChangePassword: false },
    });
    const newHash = prisma.user.update.mock.calls[0][0].data.passwordHash;
    expect(await bcrypt.compare('new-password', newHash)).toBe(true);
  });
});

describe('AuthService.login — audit', () => {
  it('logs auth.login.success with the user identity on success', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    const { service, audit, jwt } = buildDeps({
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'user-1', username: 'direction1', role: 'DIRECTION', schoolId: 'school-1', studentId: null, passwordHash }),
      },
    });
    jwt.sign.mockReturnValue('token');

    await service.login('direction1', 'correct-password');

    expect(audit.log).toHaveBeenCalledWith({
      schoolId: 'school-1',
      userId: 'user-1',
      username: 'direction1',
      role: 'DIRECTION',
      action: 'auth.login.success',
    });
  });

  it('logs auth.login.failure without leaking whether the username exists in metadata beyond a reason code', async () => {
    const { service, audit } = buildDeps({ user: { findUnique: jest.fn().mockResolvedValue(null) } });

    await expect(service.login('ghost', 'whatever')).rejects.toThrow('Identifiants incorrects');

    expect(audit.log).toHaveBeenCalledWith({
      action: 'auth.login.failure',
      username: 'ghost',
      metadata: { reason: 'unknown_username' },
    });
  });
});

describe('AuthService.login — brute-force throttle', () => {
  it('rejects with 429 after 5 failed attempts for the same username within the window', async () => {
    const { service } = buildDeps({ user: { findUnique: jest.fn().mockResolvedValue(null) } });

    for (let i = 0; i < 5; i++) {
      await expect(service.login('ghost', 'wrong')).rejects.toThrow('Identifiants incorrects');
    }

    await expect(service.login('ghost', 'wrong')).rejects.toThrow('Trop de tentatives');
  });

  it('does not throttle a different username after another one gets locked out', async () => {
    const { service } = buildDeps({ user: { findUnique: jest.fn().mockResolvedValue(null) } });

    for (let i = 0; i < 6; i++) {
      await expect(service.login('attacker-target', 'wrong')).rejects.toThrow();
    }

    await expect(service.login('someone-else', 'wrong')).rejects.toThrow('Identifiants incorrects');
  });

  it('resets the failure count on a successful login', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    const { service, loginThrottle } = buildDeps({
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'user-1', username: 'direction1', role: 'DIRECTION', schoolId: 'school-1', studentId: null, passwordHash }),
      },
    });

    loginThrottle.registerFailure('direction1');
    loginThrottle.registerFailure('direction1');
    await service.login('direction1', 'correct-password');

    expect(() => loginThrottle.assertNotLocked('direction1')).not.toThrow();
  });
});
