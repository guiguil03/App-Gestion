import { ForbiddenException } from '@nestjs/common';

import { AbsencesService } from '@/modules/absences/absences.service';
import { ABSENCE_MARKED_EVENT } from '@/modules/absences/events/absence-marked.event';

function buildPrisma(overrides: Record<string, any> = {}) {
  return {
    school: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), ...overrides.school },
    schoolClosureDate: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      ...overrides.schoolClosureDate,
    },
    student: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn(), ...overrides.student },
    attendanceRecord: { findMany: jest.fn().mockResolvedValue([]), ...overrides.attendanceRecord },
    absence: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      upsert: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findFirst: jest.fn(),
      update: jest.fn(),
      ...overrides.absence,
    },
    user: { findFirst: jest.fn(), ...overrides.user },
  } as any;
}

// closedWeekdays est requis par le code (`.includes()`), toujours présent en
// base (défaut `[]`) — les tests fournissent une école complète via ce helper
// plutôt que de répéter le champ partout.
function school(overrides: Record<string, any>) {
  return { deletedAt: null, closedWeekdays: [], ...overrides };
}

describe('AbsencesService.detectAbsences', () => {
  it('does nothing before the school deadline (reference time + tolerance)', async () => {
    const prisma = buildPrisma({
      school: {
        findMany: jest.fn().mockResolvedValue([
          school({ id: 'school-1', attendanceReferenceTime: '07:30', attendanceToleranceMinutes: 15 }),
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
          school({ id: 'school-1', attendanceReferenceTime: '07:30', attendanceToleranceMinutes: 15 }),
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

  // Un pointage "Salle de classe" (carte oubliée, pointage manuel de
  // l'enseignant) doit compter comme présent au même titre qu'un pointage
  // Portail — sinon l'élève se fait marquer absent (et le parent reçoit un
  // SMS) malgré un vrai pointage du jour.
  it('does not mark absent a student with any attendance record today, even a non-PORTAIL/ENTREE one', async () => {
    const prisma = buildPrisma({
      school: {
        findMany: jest.fn().mockResolvedValue([
          school({ id: 'school-1', attendanceReferenceTime: '07:30', attendanceToleranceMinutes: 15 }),
        ]),
      },
      student: { findMany: jest.fn().mockResolvedValue([{ id: 'student-1' }]) },
      attendanceRecord: { findMany: jest.fn().mockResolvedValue([{ studentId: 'student-1' }]) },
    });
    const events = { emit: jest.fn() } as any;
    const service = new AbsencesService(prisma, events);

    await service.detectAbsences(new Date('2026-07-14T08:00:00'));

    expect(prisma.absence.upsert).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
    const query = prisma.attendanceRecord.findMany.mock.calls[0][0];
    expect(query.where.checkpoint).toBeUndefined();
    expect(query.where.direction).toBeUndefined();
  });

  it('does not re-process a student already marked absent today (idempotent)', async () => {
    const prisma = buildPrisma({
      school: {
        findMany: jest.fn().mockResolvedValue([
          school({ id: 'school-1', attendanceReferenceTime: '07:30', attendanceToleranceMinutes: 15 }),
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

  it('skips a school on one of its recurring closed weekdays', async () => {
    const now = new Date('2026-07-14T08:00:00');
    const prisma = buildPrisma({
      school: {
        findMany: jest.fn().mockResolvedValue([
          school({
            id: 'school-1',
            attendanceReferenceTime: '07:30',
            attendanceToleranceMinutes: 15,
            closedWeekdays: [now.getDay()],
          }),
        ]),
      },
    });
    const events = { emit: jest.fn() } as any;
    const service = new AbsencesService(prisma, events);

    await service.detectAbsences(now);

    expect(prisma.student.findMany).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('skips a school on a one-off closure date', async () => {
    const prisma = buildPrisma({
      school: {
        findMany: jest.fn().mockResolvedValue([
          school({ id: 'school-1', attendanceReferenceTime: '07:30', attendanceToleranceMinutes: 15 }),
        ]),
      },
      schoolClosureDate: { findUnique: jest.fn().mockResolvedValue({ id: 'closure-1', date: '2026-07-14' }) },
    });
    const events = { emit: jest.fn() } as any;
    const service = new AbsencesService(prisma, events);

    await service.detectAbsences(new Date('2026-07-14T08:00:00'));

    expect(prisma.student.findMany).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });
});

describe('AbsencesService.listConsecutiveAbsenceAlerts', () => {
  it('returns an empty list when the school has no threshold configured', async () => {
    const prisma = buildPrisma({
      school: { findUnique: jest.fn().mockResolvedValue(school({ id: 'school-1', consecutiveAbsenceAlertThreshold: null })) },
    });
    const service = new AbsencesService(prisma, { emit: jest.fn() } as any);

    const result = await service.listConsecutiveAbsenceAlerts('school-1');

    expect(result).toEqual([]);
    expect(prisma.student.findMany).not.toHaveBeenCalled();
  });

  it('flags a student whose absence streak meets the threshold, ignoring weekends', async () => {
    // 2026-07-16 est un jeudi : jours d'école consécutifs juste avant =
    // mer 15, mar 14 (le lundi 13 et le dimanche 12 comptent aussi si fermés).
    const now = new Date('2026-07-16T20:00:00');
    const prisma = buildPrisma({
      school: {
        findUnique: jest.fn().mockResolvedValue(
          school({
            id: 'school-1',
            attendanceReferenceTime: '07:30',
            attendanceToleranceMinutes: 15,
            consecutiveAbsenceAlertThreshold: 3,
            closedWeekdays: [0, 6],
          }),
        ),
      },
      student: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'student-1',
            lastName: 'Ngoma',
            middleName: null,
            firstName: 'Alice',
            schoolClass: { id: 'class-1', name: 'CP1' },
          },
        ]),
      },
      absence: {
        findMany: jest.fn().mockResolvedValue([
          { studentId: 'student-1', date: '2026-07-16' },
          { studentId: 'student-1', date: '2026-07-15' },
          { studentId: 'student-1', date: '2026-07-14' },
        ]),
      },
    });
    const service = new AbsencesService(prisma, { emit: jest.fn() } as any);

    const result = await service.listConsecutiveAbsenceAlerts('school-1', now);

    expect(result).toEqual([
      { studentId: 'student-1', studentName: 'Ngoma Alice', schoolClassId: 'class-1', schoolClassName: 'CP1', consecutiveAbsences: 3 },
    ]);
  });

  it('does not flag a student whose streak is below the threshold', async () => {
    const now = new Date('2026-07-16T20:00:00');
    const prisma = buildPrisma({
      school: {
        findUnique: jest.fn().mockResolvedValue(
          school({
            id: 'school-1',
            attendanceReferenceTime: '07:30',
            attendanceToleranceMinutes: 15,
            consecutiveAbsenceAlertThreshold: 3,
            closedWeekdays: [0, 6],
          }),
        ),
      },
      student: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'student-1',
            lastName: 'Ngoma',
            middleName: null,
            firstName: 'Alice',
            schoolClass: { id: 'class-1', name: 'CP1' },
          },
        ]),
      },
      absence: {
        findMany: jest.fn().mockResolvedValue([{ studentId: 'student-1', date: '2026-07-16' }]),
      },
    });
    const service = new AbsencesService(prisma, { emit: jest.fn() } as any);

    const result = await service.listConsecutiveAbsenceAlerts('school-1', now);

    expect(result).toEqual([]);
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

describe('AbsencesService.justifyBulk', () => {
  it('updates all matching absences scoped to the school and returns the count', async () => {
    const prisma = buildPrisma({ absence: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) } });
    const service = new AbsencesService(prisma, { emit: jest.fn() } as any);

    const result = await service.justifyBulk(['a1', 'a2', 'a3'], 'school-1', 'Grève des transports');

    expect(result).toEqual({ count: 3 });
    expect(prisma.absence.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a1', 'a2', 'a3'] }, student: { schoolId: 'school-1' } },
      data: { justified: true, justificationReason: 'Grève des transports' },
    });
  });

  it('returns a lower count than requested when some ids do not belong to the school (silently skipped)', async () => {
    const prisma = buildPrisma({ absence: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } });
    const service = new AbsencesService(prisma, { emit: jest.fn() } as any);

    const result = await service.justifyBulk(['a1', 'other-school-absence'], 'school-1', 'Maladie');

    expect(result).toEqual({ count: 1 });
  });
});

describe('AbsencesService.listPaginated', () => {
  it('paginates and scopes to the school/class via the nested student filter', async () => {
    const prisma = buildPrisma({
      absence: { findMany: jest.fn().mockResolvedValue([{ id: 'a1' }]), count: jest.fn().mockResolvedValue(60) },
    });
    const service = new AbsencesService(prisma, { emit: jest.fn() } as any);

    const result = await service.listPaginated('school-1', { schoolClassId: 'class-1', page: 3, pageSize: 20 });

    expect(result).toEqual({ items: [{ id: 'a1' }], total: 60, page: 3, pageSize: 20 });
    expect(prisma.absence.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { student: { schoolId: 'school-1', schoolClassId: 'class-1' } },
        skip: 40,
        take: 20,
      }),
    );
  });

  it('filters by justified status when provided, and omits the filter when absent', async () => {
    const prisma = buildPrisma();
    const service = new AbsencesService(prisma, { emit: jest.fn() } as any);

    await service.listPaginated('school-1', { justified: false, page: 1, pageSize: 25 });
    expect(prisma.absence.findMany.mock.calls[0][0].where.justified).toBe(false);

    await service.listPaginated('school-1', { justified: true, page: 1, pageSize: 25 });
    expect(prisma.absence.findMany.mock.calls[1][0].where.justified).toBe(true);

    await service.listPaginated('school-1', { page: 1, pageSize: 25 });
    expect(prisma.absence.findMany.mock.calls[2][0].where.justified).toBeUndefined();
  });

  it('adds a case-insensitive OR filter on the student name when search is provided', async () => {
    const prisma = buildPrisma();
    const service = new AbsencesService(prisma, { emit: jest.fn() } as any);

    await service.listPaginated('school-1', { search: 'ngo', page: 1, pageSize: 25 });

    expect(prisma.absence.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          student: {
            schoolId: 'school-1',
            schoolClassId: undefined,
            OR: [
              { lastName: { contains: 'ngo', mode: 'insensitive' } },
              { firstName: { contains: 'ngo', mode: 'insensitive' } },
              { middleName: { contains: 'ngo', mode: 'insensitive' } },
            ],
          },
        },
      }),
    );
  });
});

describe('AbsencesService.create', () => {
  it('rejects a student outside the school', async () => {
    const prisma = buildPrisma({ student: { findFirst: jest.fn().mockResolvedValue(null) } });
    const events = { emit: jest.fn() } as any;
    const service = new AbsencesService(prisma, events);

    await expect(
      service.create('school-1', { studentId: 'student-1', date: '2026-08-10' }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.absence.upsert).not.toHaveBeenCalled();
  });

  it('creates an unjustified-by-default absence for a future date, scoped by studentId+date', async () => {
    const prisma = buildPrisma({ student: { findFirst: jest.fn().mockResolvedValue({ id: 'student-1' }) } });
    prisma.absence.upsert.mockResolvedValue({ id: 'absence-1' });
    const events = { emit: jest.fn() } as any;
    const service = new AbsencesService(prisma, events);

    await service.create('school-1', { studentId: 'student-1', date: '2026-08-10' });

    expect(prisma.absence.upsert).toHaveBeenCalledWith({
      where: { studentId_date: { studentId: 'student-1', date: '2026-08-10' } },
      create: { studentId: 'student-1', date: '2026-08-10', justified: undefined, justificationReason: undefined },
      update: { justified: undefined, justificationReason: undefined },
    });
  });

  it('passes through justified/justificationReason when provided', async () => {
    const prisma = buildPrisma({ student: { findFirst: jest.fn().mockResolvedValue({ id: 'student-1' }) } });
    prisma.absence.upsert.mockResolvedValue({ id: 'absence-1' });
    const events = { emit: jest.fn() } as any;
    const service = new AbsencesService(prisma, events);

    await service.create('school-1', {
      studentId: 'student-1',
      date: '2026-08-10',
      justified: true,
      justificationReason: 'Rendez-vous médical',
    });

    expect(prisma.absence.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ justified: true, justificationReason: 'Rendez-vous médical' }),
        update: expect.objectContaining({ justified: true, justificationReason: 'Rendez-vous médical' }),
      }),
    );
  });

  it('does not emit ABSENCE_MARKED_EVENT — the parent is assumed already informed', async () => {
    const prisma = buildPrisma({ student: { findFirst: jest.fn().mockResolvedValue({ id: 'student-1' }) } });
    prisma.absence.upsert.mockResolvedValue({ id: 'absence-1' });
    const events = { emit: jest.fn() } as any;
    const service = new AbsencesService(prisma, events);

    await service.create('school-1', { studentId: 'student-1', date: '2026-08-10' });

    expect(events.emit).not.toHaveBeenCalled();
  });
});
