import { ForbiddenException } from '@nestjs/common';

import { TenantContext } from '@/common/tenant/tenant-context';
import type { AuthenticatedUser } from '@/modules/auth/types';

function buildContext(user: AuthenticatedUser, headers: Record<string, string | string[] | undefined> = {}) {
  const request = { user, headers } as any;
  return new TenantContext(request);
}

describe('TenantContext.schoolId', () => {
  it('returns the school-scoped user own schoolId', () => {
    const context = buildContext({
      userId: 'u1',
      username: 'direction1',
      role: 'DIRECTION',
      schoolId: 'school-1',
      studentId: null,
      type: 'access',
    });

    expect(context.schoolId).toBe('school-1');
  });

  it('reads the school from the x-school-id header for an ADMIN account', () => {
    const context = buildContext(
      { userId: 'u1', username: 'admin1', role: 'ADMIN', schoolId: null, studentId: null, type: 'access' },
      { 'x-school-id': 'school-42' },
    );

    expect(context.schoolId).toBe('school-42');
  });

  it('rejects an ADMIN request missing the x-school-id header', () => {
    const context = buildContext({
      userId: 'u1',
      username: 'admin1',
      role: 'ADMIN',
      schoolId: null,
      studentId: null,
      type: 'access',
    });

    expect(() => context.schoolId).toThrow(ForbiddenException);
  });
});
