import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { StaffService } from '@/modules/staff/staff.service';

function buildPrisma(overrides: Record<string, any> = {}) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'user-1' }),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(2),
    },
    ...overrides,
  } as any;
}

describe('StaffService.create', () => {
  it('provisions an ENSEIGNANT account with a generated username and password', async () => {
    const prisma = buildPrisma();
    const service = new StaffService(prisma);

    const result = await service.create({ role: 'ENSEIGNANT', firstName: 'Jean', lastName: 'Dupont' }, 'school-1');

    expect(result.username).toBe('jean.dupont');
    expect(result.password).toHaveLength(8);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ username: 'jean.dupont', role: 'ENSEIGNANT', schoolId: 'school-1' }),
    });
  });
});

describe('StaffService.resetPassword', () => {
  it('generates a new password for an existing staff account of the current school, keeping the username', async () => {
    const prisma = buildPrisma({
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'user-1', username: 'jean.dupont', role: 'ENSEIGNANT' }), update: jest.fn() },
    });
    const service = new StaffService(prisma);

    const result = await service.resetPassword('user-1', 'school-1');

    expect(result.username).toBe('jean.dupont');
    expect(result.password).toHaveLength(8);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { passwordHash: expect.any(String) } });
  });

  it('rejects resetting an account outside the current school or not staff', async () => {
    const prisma = buildPrisma({ user: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new StaffService(prisma);

    await expect(service.resetPassword('user-1', 'school-1')).rejects.toThrow(NotFoundException);
  });
});

describe('StaffService.disable', () => {
  it('sets disabledAt on a staff account of the current school', async () => {
    const prisma = buildPrisma({
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'user-1', role: 'ENSEIGNANT' }), update: jest.fn(), count: jest.fn() },
    });
    const service = new StaffService(prisma);

    await service.disable('user-1', 'school-1', 'user-2');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { disabledAt: expect.any(Date) },
      select: { id: true, username: true, role: true, disabledAt: true },
    });
  });

  it('rejects disabling an account outside the current school', async () => {
    const prisma = buildPrisma({ user: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new StaffService(prisma);

    await expect(service.disable('user-1', 'school-1', 'user-2')).rejects.toThrow(NotFoundException);
  });

  it('rejects self-disable', async () => {
    const prisma = buildPrisma({ user: { findFirst: jest.fn().mockResolvedValue({ id: 'user-1', role: 'ENSEIGNANT' }) } });
    const service = new StaffService(prisma);

    await expect(service.disable('user-1', 'school-1', 'user-1')).rejects.toThrow(ForbiddenException);
  });

  it('rejects disabling the last active DIRECTION account of the school', async () => {
    const prisma = buildPrisma({
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 'user-1', role: 'DIRECTION' }),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    const service = new StaffService(prisma);

    await expect(service.disable('user-1', 'school-1', 'user-2')).rejects.toThrow(ForbiddenException);
  });

  it('allows disabling a DIRECTION account when another one remains active', async () => {
    const prisma = buildPrisma({
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 'user-1', role: 'DIRECTION' }),
        count: jest.fn().mockResolvedValue(2),
        update: jest.fn(),
      },
    });
    const service = new StaffService(prisma);

    await service.disable('user-1', 'school-1', 'user-2');

    expect(prisma.user.update).toHaveBeenCalled();
  });
});
