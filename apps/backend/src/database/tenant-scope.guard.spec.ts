import { findTenantScopeViolation, createTenantScopeMiddleware, MissingTenantScopeError } from '@/database/tenant-scope.guard';

describe('findTenantScopeViolation', () => {
  it('flags a query on a tenant-scoped model with no schoolId in the where clause', () => {
    expect(findTenantScopeViolation('Student', 'findMany', { deletedAt: null })).toBe('Student.findMany');
  });

  it('flags a query with no where clause at all', () => {
    expect(findTenantScopeViolation('Student', 'findMany', undefined)).toBe('Student.findMany');
  });

  it('does not flag a query that includes schoolId in the where clause', () => {
    expect(findTenantScopeViolation('Student', 'findMany', { schoolId: 'school-1', deletedAt: null })).toBeNull();
  });

  it('does not flag models outside the tenant-scoped list', () => {
    expect(findTenantScopeViolation('User', 'findMany', {})).toBeNull();
  });

  it('does not flag findUnique (targets a single row by its own unique key)', () => {
    expect(findTenantScopeViolation('Student', 'findUnique', { id: 'student-1' })).toBeNull();
  });

  it('flags update/delete actions the same way as reads', () => {
    expect(findTenantScopeViolation('SchoolClass', 'update', { id: 'class-1' })).toBe('SchoolClass.update');
    expect(findTenantScopeViolation('AttendanceSession', 'deleteMany', { id: 'session-1' })).toBe(
      'AttendanceSession.deleteMany',
    );
  });
});

describe('createTenantScopeMiddleware', () => {
  function fakeNext(result: unknown = []) {
    return jest.fn().mockResolvedValue(result);
  }

  it('in warn mode, logs the violation and still forwards the query', async () => {
    const warn = jest.fn();
    const middleware = createTenantScopeMiddleware({ mode: 'warn', logger: { warn } as any });
    const next = fakeNext(['row']);

    const result = await middleware({ model: 'Student', action: 'findMany', args: {} } as any, next);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Student.findMany'));
    expect(next).toHaveBeenCalled();
    expect(result).toEqual(['row']);
  });

  it('in throw mode, throws instead of forwarding the query', async () => {
    const middleware = createTenantScopeMiddleware({ mode: 'throw' });
    const next = fakeNext();

    await expect(
      middleware({ model: 'Student', action: 'findMany', args: {} } as any, next),
    ).rejects.toBeInstanceOf(MissingTenantScopeError);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards compliant queries without logging or throwing in either mode', async () => {
    const warn = jest.fn();
    const middleware = createTenantScopeMiddleware({ mode: 'warn', logger: { warn } as any });
    const next = fakeNext(['row']);

    await middleware({ model: 'Student', action: 'findMany', args: { where: { schoolId: 's1' } } } as any, next);

    expect(warn).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
