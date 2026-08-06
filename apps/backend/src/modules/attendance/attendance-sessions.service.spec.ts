import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { AttendanceSessionsService } from '@/modules/attendance/attendance-sessions.service';
import type { AuthenticatedUser } from '@/modules/auth/types';

function buildPrisma(overrides: Record<string, any> = {}) {
  return {
    schoolClass: { findFirst: jest.fn() },
    attendanceSession: { upsert: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    ...overrides,
  } as any;
}

function buildUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    userId: 'teacher-1',
    username: 'ens1',
    role: 'ENSEIGNANT',
    schoolId: 'school-1',
    studentId: null,
    mustChangePassword: false,
    type: 'access',
    ...overrides,
  };
}

describe('AttendanceSessionsService.createFromSync', () => {
  it('returns null without touching prisma when the user has no school (ADMIN/DIRECTION-less account)', async () => {
    const prisma = buildPrisma();
    const service = new AttendanceSessionsService(prisma);

    const result = await service.createFromSync(buildUser({ schoolId: null }), {
      id: 's1',
      school_class_id: 'c1',
      opened_at: '2026-01-01T08:00:00.000Z',
      expires_at: '2026-01-01T08:15:00.000Z',
      closed_at: null,
    } as any);

    expect(result).toBeNull();
    expect(prisma.schoolClass.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a class outside the teacher's school", async () => {
    const prisma = buildPrisma({ schoolClass: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new AttendanceSessionsService(prisma);

    await expect(
      service.createFromSync(buildUser(), {
        id: 's1',
        school_class_id: 'c1',
        opened_at: '2026-01-01T08:00:00.000Z',
        expires_at: '2026-01-01T08:15:00.000Z',
        closed_at: null,
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates the session scoped to the authenticated teacher and school, ignoring any teacherId/schoolId in the payload', async () => {
    const prisma = buildPrisma({ schoolClass: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) } });
    prisma.attendanceSession.upsert.mockResolvedValue({ id: 's1' });
    const service = new AttendanceSessionsService(prisma);

    await service.createFromSync(buildUser(), {
      id: 's1',
      school_class_id: 'c1',
      opened_at: '2026-01-01T08:00:00.000Z',
      expires_at: '2026-01-01T08:15:00.000Z',
      closed_at: null,
    } as any);

    expect(prisma.attendanceSession.upsert).toHaveBeenCalledWith({
      where: { id: 's1' },
      create: {
        id: 's1',
        schoolId: 'school-1',
        schoolClassId: 'c1',
        teacherId: 'teacher-1',
        openedAt: new Date('2026-01-01T08:00:00.000Z'),
        expiresAt: new Date('2026-01-01T08:15:00.000Z'),
        closedAt: null,
      },
      update: {},
    });
  });
});

describe('AttendanceSessionsService.closeFromSync', () => {
  it('throws when the session does not belong to the requesting teacher', async () => {
    const prisma = buildPrisma({ attendanceSession: { findFirst: jest.fn().mockResolvedValue(null), upsert: jest.fn(), update: jest.fn() } });
    const service = new AttendanceSessionsService(prisma);

    await expect(service.closeFromSync(buildUser(), { id: 's1', closed_at: '2026-01-01T08:20:00.000Z' } as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('is a no-op when the session is already closed', async () => {
    const closedSession = { id: 's1', closedAt: new Date('2026-01-01T08:10:00.000Z') };
    const prisma = buildPrisma({
      attendanceSession: { findFirst: jest.fn().mockResolvedValue(closedSession), upsert: jest.fn(), update: jest.fn() },
    });
    const service = new AttendanceSessionsService(prisma);

    const result = await service.closeFromSync(buildUser(), { id: 's1', closed_at: '2026-01-01T08:20:00.000Z' } as any);

    expect(result).toBe(closedSession);
    expect(prisma.attendanceSession.update).not.toHaveBeenCalled();
  });

  it('closes an open session owned by the requesting teacher', async () => {
    const openSession = { id: 's1', closedAt: null };
    const prisma = buildPrisma({
      attendanceSession: {
        findFirst: jest.fn().mockResolvedValue(openSession),
        upsert: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 's1', closedAt: new Date('2026-01-01T08:20:00.000Z') }),
      },
    });
    const service = new AttendanceSessionsService(prisma);

    await service.closeFromSync(buildUser(), { id: 's1', closed_at: '2026-01-01T08:20:00.000Z' } as any);

    expect(prisma.attendanceSession.findFirst).toHaveBeenCalledWith({ where: { id: 's1', teacherId: 'teacher-1' } });
    expect(prisma.attendanceSession.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { closedAt: new Date('2026-01-01T08:20:00.000Z') },
    });
  });
});
