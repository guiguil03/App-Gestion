import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { ClassesService } from '@/modules/classes/classes.service';

function buildPrisma(overrides: Record<string, any> = {}) {
  return {
    schoolClass: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    ...overrides,
  } as any;
}

describe('ClassesService', () => {
  it('creates a class scoped to the current school', async () => {
    const prisma = buildPrisma({ schoolClass: { create: jest.fn().mockResolvedValue({ id: 'class-1' }) } });
    const service = new ClassesService(prisma);

    await service.create({ name: '6e A', promotion: '2026' }, 'school-1');

    expect(prisma.schoolClass.create).toHaveBeenCalledWith({
      data: { name: '6e A', promotion: '2026', schoolId: 'school-1' },
    });
  });

  it('rejects updating a class that belongs to another school', async () => {
    const prisma = buildPrisma({ schoolClass: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new ClassesService(prisma);

    await expect(service.update('class-1', { name: 'x' }, 'school-1')).rejects.toThrow(ForbiddenException);
  });

  it('rejects assigning a user that is not ENSEIGNANT/SURVEILLANT of this school', async () => {
    const prisma = buildPrisma({
      schoolClass: { findFirst: jest.fn().mockResolvedValue({ id: 'class-1' }) },
      user: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new ClassesService(prisma);

    await expect(service.assignTeacher('class-1', 'user-1', 'school-1')).rejects.toThrow(NotFoundException);
  });
});

describe('ClassesService.importBulk', () => {
  it('creates new (name, promotion) pairs and skips ones that already exist (case-insensitive)', async () => {
    const prisma = buildPrisma({
      schoolClass: {
        findMany: jest.fn().mockResolvedValue([{ name: '6e A', promotion: '2026' }]),
        create: jest.fn().mockResolvedValue({ id: 'new-class' }),
      },
    });
    const service = new ClassesService(prisma);

    const result = await service.importBulk(
      [
        { name: '6E A', promotion: '2026' }, // déjà existante (insensible à la casse) → skip
        { name: '5e B', promotion: '2026' }, // nouvelle → created
      ],
      'school-1',
    );

    expect(result).toEqual({ created: 1, skipped: 1, errors: [] });
    expect(prisma.schoolClass.create).toHaveBeenCalledTimes(1);
    expect(prisma.schoolClass.create).toHaveBeenCalledWith({ data: { name: '5e B', promotion: '2026', schoolId: 'school-1' } });
  });

  it('reports a row-level error for a missing name/promotion without aborting the batch', async () => {
    const prisma = buildPrisma({
      schoolClass: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'new-class' }),
      },
    });
    const service = new ClassesService(prisma);

    const result = await service.importBulk([{ name: '', promotion: '2026' }, { name: '5e B', promotion: '2026' }], 'school-1');

    expect(result.created).toBe(1);
    expect(result.errors).toEqual([{ row: 1, message: 'Nom et promotion requis' }]);
  });

  it('does not create the same pair twice within the same import batch', async () => {
    const prisma = buildPrisma({
      schoolClass: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'new-class' }),
      },
    });
    const service = new ClassesService(prisma);

    const result = await service.importBulk(
      [
        { name: '5e B', promotion: '2026' },
        { name: '5e B', promotion: '2026' },
      ],
      'school-1',
    );

    expect(result).toEqual({ created: 1, skipped: 1, errors: [] });
  });
});
