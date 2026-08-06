import { AuditService } from '@/modules/audit/audit.service';

function buildPrisma(overrides: Record<string, any> = {}) {
  return {
    auditLog: { create: jest.fn(), findMany: jest.fn() },
    parentGuardian: { findMany: jest.fn() },
    student: { findMany: jest.fn() },
    ...overrides,
  } as any;
}

describe('AuditService.log', () => {
  it('writes the entry with null defaults for optional fields', async () => {
    const prisma = buildPrisma();
    const service = new AuditService(prisma);

    await service.log({ action: 'LOGIN' });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        schoolId: null,
        userId: null,
        username: null,
        role: null,
        action: 'LOGIN',
        targetType: null,
        targetId: null,
        metadata: undefined,
      },
    });
  });

  it('never throws even if the write fails — logging must not break the audited action', async () => {
    const prisma = buildPrisma({ auditLog: { create: jest.fn().mockRejectedValue(new Error('db down')), findMany: jest.fn() } });
    const service = new AuditService(prisma);

    await expect(service.log({ action: 'LOGIN' })).resolves.toBeUndefined();
  });
});

describe('AuditService.list', () => {
  it('filters by school, action substring and date range, capped at 500 entries', async () => {
    const prisma = buildPrisma();
    prisma.auditLog.findMany.mockResolvedValue([]);
    const service = new AuditService(prisma);

    await service.list('school-1', { action: 'LOGIN', startDate: '2026-01-01', endDate: '2026-01-31', limit: 1000 });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: {
        schoolId: 'school-1',
        action: { contains: 'LOGIN' },
        createdAt: { gte: new Date('2026-01-01T00:00:00'), lte: new Date('2026-01-31T23:59:59.999') },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  });

  it('defaults to a 200-entry cap when no limit is given', async () => {
    const prisma = buildPrisma();
    prisma.auditLog.findMany.mockResolvedValue([]);
    const service = new AuditService(prisma);

    await service.list('school-1', {});

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: { schoolId: 'school-1', action: undefined, createdAt: undefined },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  });
});

describe('AuditService.listNotificationsForParent', () => {
  it("returns [] without querying audit logs when the account has no children", async () => {
    const prisma = buildPrisma();
    prisma.parentGuardian.findMany.mockResolvedValue([]);
    const service = new AuditService(prisma);

    const result = await service.listNotificationsForParent('user-1');

    expect(result).toEqual([]);
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it('scopes to the notification entries of the account\'s own children only, joined with student names', async () => {
    const prisma = buildPrisma();
    prisma.parentGuardian.findMany.mockResolvedValue([{ studentId: 'student-1' }, { studentId: 'student-2' }]);
    prisma.auditLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        createdAt: new Date('2026-07-14T07:31:00Z'),
        action: 'NOTIFICATION_SMS_SENT',
        targetType: 'Student',
        targetId: 'student-1',
        metadata: { title: 'Arrivée' },
      },
      {
        id: 'log-2',
        createdAt: new Date('2026-07-14T00:00:00Z'),
        action: 'NOTIFICATION_PUSH_FAILED',
        targetType: 'Student',
        targetId: 'student-2',
        metadata: { title: 'Absence' },
      },
    ]);
    prisma.student.findMany.mockResolvedValue([
      { id: 'student-1', firstName: 'Jane', lastName: 'Doe' },
      { id: 'student-2', firstName: 'John', lastName: 'Smith' },
    ]);
    const service = new AuditService(prisma);

    const result = await service.listNotificationsForParent('user-1', 50);

    expect(prisma.parentGuardian.findMany).toHaveBeenCalledWith({ where: { userId: 'user-1' }, select: { studentId: true } });
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: { targetType: 'Student', targetId: { in: ['student-1', 'student-2'] }, action: { startsWith: 'NOTIFICATION_' } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    expect(result).toEqual([
      {
        id: 'log-1',
        createdAt: new Date('2026-07-14T07:31:00Z'),
        channel: 'SMS',
        status: 'SENT',
        kind: 'Arrivée',
        student: { id: 'student-1', firstName: 'Jane', lastName: 'Doe' },
      },
      {
        id: 'log-2',
        createdAt: new Date('2026-07-14T00:00:00Z'),
        channel: 'PUSH',
        status: 'FAILED',
        kind: 'Absence',
        student: { id: 'student-2', firstName: 'John', lastName: 'Smith' },
      },
    ]);
  });

  it('caps the limit at 200', async () => {
    const prisma = buildPrisma();
    prisma.parentGuardian.findMany.mockResolvedValue([{ studentId: 'student-1' }]);
    prisma.auditLog.findMany.mockResolvedValue([]);
    prisma.student.findMany.mockResolvedValue([]);
    const service = new AuditService(prisma);

    await service.listNotificationsForParent('user-1', 1000);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 200 }));
  });
});
