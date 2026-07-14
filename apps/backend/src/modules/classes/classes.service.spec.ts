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
