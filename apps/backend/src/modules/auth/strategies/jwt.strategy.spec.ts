import { UnauthorizedException } from '@nestjs/common';

import { JwtStrategy } from '@/modules/auth/strategies/jwt.strategy';
import type { AuthenticatedUser } from '@/modules/auth/types';

function buildPayload(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    userId: 'user-1',
    username: 'direction1',
    role: 'DIRECTION',
    schoolId: 'school-1',
    studentId: null,
    type: 'access',
    ...overrides,
  };
}

describe('JwtStrategy', () => {
  it('accepts a valid access token for an active account', async () => {
    const findUnique = jest.fn().mockResolvedValue({ disabledAt: null });
    const strategy = new JwtStrategy({ user: { findUnique } } as any);

    const result = await strategy.validate(buildPayload());

    expect(result.userId).toBe('user-1');
  });

  it('rejects a refresh token used as an access token', async () => {
    const findUnique = jest.fn().mockResolvedValue({ disabledAt: null });
    const strategy = new JwtStrategy({ user: { findUnique } } as any);

    await expect(strategy.validate(buildPayload({ type: 'refresh' }))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a disabled account even with a valid token', async () => {
    const findUnique = jest.fn().mockResolvedValue({ disabledAt: new Date() });
    const strategy = new JwtStrategy({ user: { findUnique } } as any);

    await expect(strategy.validate(buildPayload())).rejects.toThrow(UnauthorizedException);
  });
});
