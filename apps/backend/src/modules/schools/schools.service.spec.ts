import { NotFoundException } from '@nestjs/common';

import { SchoolsService } from '@/modules/schools/schools.service';

function buildPrisma(overrides: Record<string, any> = {}) {
  return {
    school: {
      findUnique: jest.fn(),
      update: jest.fn(),
      ...overrides.school,
    },
    schoolClosureDate: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      ...overrides.schoolClosureDate,
    },
  } as any;
}

describe('SchoolsService.updateAttendanceSettings', () => {
  it('persists the scan window, reference time, tolerance, closed weekdays and alert threshold', async () => {
    const prisma = buildPrisma({
      school: {
        findUnique: jest.fn().mockResolvedValue({ id: 'school-1' }),
        update: jest.fn().mockResolvedValue({
          scanWindowStart: '06:00',
          scanWindowEnd: '18:00',
          attendanceReferenceTime: '07:30',
          attendanceToleranceMinutes: 15,
          closedWeekdays: [0, 6],
          consecutiveAbsenceAlertThreshold: 3,
        }),
      },
    });
    const service = new SchoolsService(prisma);

    const result = await service.updateAttendanceSettings('school-1', {
      scanWindowStart: '06:00',
      scanWindowEnd: '18:00',
      attendanceReferenceTime: '07:30',
      attendanceToleranceMinutes: 15,
      closedWeekdays: [0, 6],
      consecutiveAbsenceAlertThreshold: 3,
    });

    expect(prisma.school.update).toHaveBeenCalledWith({
      where: { id: 'school-1' },
      data: {
        scanWindowStart: '06:00',
        scanWindowEnd: '18:00',
        attendanceReferenceTime: '07:30',
        attendanceToleranceMinutes: 15,
        closedWeekdays: [0, 6],
        consecutiveAbsenceAlertThreshold: 3,
      },
    });
    expect(result).toEqual({
      scanWindowStart: '06:00',
      scanWindowEnd: '18:00',
      attendanceReferenceTime: '07:30',
      attendanceToleranceMinutes: 15,
      closedWeekdays: [0, 6],
      consecutiveAbsenceAlertThreshold: 3,
    });
  });

  it('throws when the school does not exist', async () => {
    const prisma = buildPrisma({ school: { findUnique: jest.fn().mockResolvedValue(null) } });
    const service = new SchoolsService(prisma);

    await expect(service.updateAttendanceSettings('missing', {})).rejects.toThrow(NotFoundException);
  });
});

describe('SchoolsService.updateProfile', () => {
  it('persists name, address and director name', async () => {
    const prisma = buildPrisma({
      school: {
        findUnique: jest.fn().mockResolvedValue({ id: 'school-1' }),
        update: jest.fn().mockResolvedValue({
          name: 'École Les Palmiers',
          address: '12 avenue de la Paix',
          directorName: 'M. Diallo',
          logoUrl: null,
        }),
      },
    });
    const service = new SchoolsService(prisma);

    const result = await service.updateProfile('school-1', {
      name: 'École Les Palmiers',
      address: '12 avenue de la Paix',
      directorName: 'M. Diallo',
    });

    expect(prisma.school.update).toHaveBeenCalledWith({
      where: { id: 'school-1' },
      data: { name: 'École Les Palmiers', address: '12 avenue de la Paix', directorName: 'M. Diallo' },
    });
    expect(result).toEqual({
      name: 'École Les Palmiers',
      address: '12 avenue de la Paix',
      directorName: 'M. Diallo',
      logoUrl: null,
    });
  });

  it('throws when the school does not exist', async () => {
    const prisma = buildPrisma({ school: { findUnique: jest.fn().mockResolvedValue(null) } });
    const service = new SchoolsService(prisma);

    await expect(service.updateProfile('missing', {})).rejects.toThrow(NotFoundException);
  });
});

describe('SchoolsService.setLogo', () => {
  it('persists the uploaded logo URL', async () => {
    const prisma = buildPrisma({
      school: {
        findUnique: jest.fn().mockResolvedValue({ id: 'school-1' }),
        update: jest.fn().mockResolvedValue({ logoUrl: 'https://storage.example/logo.png' }),
      },
    });
    const service = new SchoolsService(prisma);

    const result = await service.setLogo('school-1', 'https://storage.example/logo.png');

    expect(prisma.school.update).toHaveBeenCalledWith({
      where: { id: 'school-1' },
      data: { logoUrl: 'https://storage.example/logo.png' },
    });
    expect(result).toEqual({ logoUrl: 'https://storage.example/logo.png' });
  });
});

describe('SchoolsService closure dates', () => {
  it('upserts a closure date scoped to the school', async () => {
    const prisma = buildPrisma({
      school: { findUnique: jest.fn().mockResolvedValue({ id: 'school-1' }) },
      schoolClosureDate: {
        upsert: jest.fn().mockResolvedValue({ id: 'closure-1', schoolId: 'school-1', date: '2026-12-25', label: 'Noël' }),
      },
    });
    const service = new SchoolsService(prisma);

    const result = await service.addClosureDate('school-1', { date: '2026-12-25', label: 'Noël' });

    expect(prisma.schoolClosureDate.upsert).toHaveBeenCalledWith({
      where: { schoolId_date: { schoolId: 'school-1', date: '2026-12-25' } },
      create: { schoolId: 'school-1', date: '2026-12-25', label: 'Noël' },
      update: { label: 'Noël' },
    });
    expect(result).toEqual({ id: 'closure-1', schoolId: 'school-1', date: '2026-12-25', label: 'Noël' });
  });

  it('removes a closure date scoped to the school', async () => {
    const prisma = buildPrisma({ schoolClosureDate: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) } });
    const service = new SchoolsService(prisma);

    await service.removeClosureDate('school-1', 'closure-1');

    expect(prisma.schoolClosureDate.deleteMany).toHaveBeenCalledWith({
      where: { id: 'closure-1', schoolId: 'school-1' },
    });
  });

  it('throws when removing a closure date that does not belong to the school', async () => {
    const prisma = buildPrisma({ schoolClosureDate: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) } });
    const service = new SchoolsService(prisma);

    await expect(service.removeClosureDate('school-1', 'other-schools-closure')).rejects.toThrow(NotFoundException);
  });
});
