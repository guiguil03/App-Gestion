import { ForbiddenException } from '@nestjs/common';

import { AbsencesService } from '@/modules/absences/absences.service';
import { ABSENCE_MARKED_EVENT } from '@/modules/absences/events/absence-marked.event';

function buildPrisma(overrides: Record<string, any> = {}) {
  return {
    school: { findMany: jest.fn().mockResolvedValue([]) },
    student: { findMany: jest.fn().mockResolvedValue([]) },
    attendanceRecord: { findMany: jest.fn().mockResolvedValue([]) },
    absence: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: { findFirst: jest.fn() },
    ...overrides,
  } as any;
}

describe('AbsencesService.detectAbsences', () => {
  it('does nothing before the school deadline (reference time + tolerance)', async () => {
    const prisma = buildPrisma({
      school: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'school-1', deletedAt: null, attendanceReferenceTime: '07:30', attendanceToleranceMinutes: 15 },
        ]),
      },
    });
    const events = { emit: jest.fn() } as any;
    const service = new AbsencesService(prisma, events);

    await service.detectAbsences(new Date('2026-07-14T07:00:00'));

    expect(prisma.student.findMany).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('marks absent a student with no PORTAIL/ENTREE record after the deadline, and emits an event', async () => {
    const prisma = buildPrisma({
      school: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'school-1', deletedAt: null, attendanceReferenceTime: '07:30', attendanceToleranceMinutes: 15 },
        ]),
      },
      student: { findMany: jest.fn().mockResolvedValue([{ id: 'student-1' }, { id: 'student-2' }]) },
      attendanceRecord: { findMany: jest.fn().mockResolvedValue([{ studentId: 'student-2' }]) },
      absence: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({ id: 'absence-1', studentId: 'student-1' }),
      },
    });
    const events = { emit: jest.fn() } as any;
    const service = new AbsencesService(prisma, events);

    await service.detectAbsences(new Date('2026-07-14T08:00:00'));

    expect(prisma.absence.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.absence.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { studentId: 'student-1', date: '2026-07-14' } }),
    );
    expect(events.emit).toHaveBeenCalledWith(
      ABSENCE_MARKED_EVENT,
      expect.objectContaining({ studentId: 'student-1', schoolId: 'school-1', date: '2026-07-14' }),
    );
  });

  it('does not re-process a student already marked absent today (idempotent)', async () => {
    const prisma = buildPrisma({
      school: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'school-1', deletedAt: null, attendanceReferenceTime: '07:30', attendanceToleranceMinutes: 15 },
        ]),
      },
      student: { findMany: jest.fn().mockResolvedValue([{ id: 'student-1' }]) },
      attendanceRecord: { findMany: jest.fn().mockResolvedValue([]) },
      absence: {
        findMany: jest.fn().mockResolvedValue([{ studentId: 'student-1' }]),
        upsert: jest.fn(),
      },
    });
    const events = { emit: jest.fn() } as any;
    const service = new AbsencesService(prisma, events);

    await service.detectAbsences(new Date('2026-07-14T08:00:00'));

    expect(prisma.absence.upsert).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });
});

describe('AbsencesService.justify', () => {
  it('lets DIRECTION justify any absence in its school', async () => {
    const prisma = buildPrisma({
      absence: {
        findFirst: jest.fn().mockResolvedValue({ id: 'absence-1', studentId: 'student-1' }),
        update: jest.fn().mockResolvedValue({ id: 'absence-1', justified: true }),
      },
    });
    const service = new AbsencesService(prisma, { emit: jest.fn() } as any);

    const result = await service.justify('absence-1', 'school-1', 'Maladie', { role: 'DIRECTION', userId: 'dir-1' });

    expect(result.justified).toBe(true);
    expect(prisma.absence.update).toHaveBeenCalledWith({
      where: { id: 'absence-1' },
      data: { justified: true, justificationReason: 'Maladie' },
    });
  });

  it('rejects a PARENT justifying an absence of a child that is not theirs', async () => {
    const prisma = buildPrisma({
      absence: { findFirst: jest.fn().mockResolvedValue({ id: 'absence-1', studentId: 'student-1' }) },
      user: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new AbsencesService(prisma, { emit: jest.fn() } as any);

    await expect(
      service.justify('absence-1', 'school-1', 'Maladie', { role: 'PARENT', userId: 'parent-1' }),
    ).rejects.toThrow(ForbiddenException);
  });
});
