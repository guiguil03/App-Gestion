import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { AdminAccountsService } from '@/modules/admin/admin-accounts.service';

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

describe('AdminAccountsService.create', () => {
  it('provisions an ADMIN account with a generated username and password, no schoolId', async () => {
    const prisma = buildPrisma();
    const service = new AdminAccountsService(prisma);

    const result = await service.create({ firstName: 'Jean', lastName: 'Dupont' });

    expect(result.username).toBe('jean.dupont');
    expect(result.password).toHaveLength(8);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ username: 'jean.dupont', role: 'ADMIN', schoolId: null }),
    });
  });
});

describe('AdminAccountsService.disable', () => {
  it('sets disabledAt on an ADMIN account when another one remains active', async () => {
    const prisma = buildPrisma({
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 'user-1', role: 'ADMIN' }),
        count: jest.fn().mockResolvedValue(2),
        update: jest.fn(),
      },
    });
    const service = new AdminAccountsService(prisma);

    await service.disable('user-1', 'user-2');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { disabledAt: expect.any(Date) },
      select: { id: true, username: true, disabledAt: true },
    });
  });

  it('rejects disabling an unknown account', async () => {
    const prisma = buildPrisma({ user: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new AdminAccountsService(prisma);

    await expect(service.disable('user-1', 'user-2')).rejects.toThrow(NotFoundException);
  });

  it('rejects self-disable', async () => {
    const prisma = buildPrisma({ user: { findFirst: jest.fn().mockResolvedValue({ id: 'user-1', role: 'ADMIN' }) } });
    const service = new AdminAccountsService(prisma);

    await expect(service.disable('user-1', 'user-1')).rejects.toThrow(ForbiddenException);
  });

  it('rejects disabling the last active ADMIN account', async () => {
    const prisma = buildPrisma({
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 'user-1', role: 'ADMIN' }),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    const service = new AdminAccountsService(prisma);

    await expect(service.disable('user-1', 'user-2')).rejects.toThrow(ForbiddenException);
  });
});
