import { ServiceUnavailableException } from '@nestjs/common';

import { HealthController } from '@/modules/health/health.controller';

function buildDeps(overrides: { queryRaw?: jest.Mock } = {}) {
  const prisma = { $queryRaw: overrides.queryRaw ?? jest.fn().mockResolvedValue([{ '?column?': 1 }]) } as any;
  const controller = new HealthController(prisma);
  return { controller, prisma };
}

describe('HealthController.check', () => {
  it('returns ok when the database responds', async () => {
    const { controller, prisma } = buildDeps();

    const result = await controller.check();

    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(result).toEqual({ status: 'ok' });
  });

  it('throws 503 when the database is unreachable, so Railway knows to restart the instance', async () => {
    const { controller } = buildDeps({ queryRaw: jest.fn().mockRejectedValue(new Error('connection refused')) });

    await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
  });
});
