import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';

import { PrismaService } from '@/database/prisma.service';
import { HealthController } from '@/modules/health/health.controller';

// PrismaHealthIndicator essaie d'abord $runCommandRaw (Mongo) puis retombe
// sur $queryRawUnsafe('SELECT 1') dès que l'erreur contient "Use the mongodb
// provider" — exactement le message que Prisma renvoie pour un provider
// postgresql (vérifié contre le vrai client généré).
function buildPrisma(overrides: { queryRawUnsafe?: jest.Mock } = {}) {
  return {
    $runCommandRaw: jest
      .fn()
      .mockRejectedValue(new Error('The postgresql provider does not support $runCommandRaw. Use the mongodb provider.')),
    $queryRawUnsafe: overrides.queryRawUnsafe ?? jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  } as unknown as PrismaService;
}

async function buildController(prisma: PrismaService) {
  const module = await Test.createTestingModule({
    imports: [TerminusModule],
    controllers: [HealthController],
    providers: [{ provide: PrismaService, useValue: prisma }],
  }).compile();

  return module.get(HealthController);
}

describe('HealthController.check', () => {
  it('returns ok when the database responds', async () => {
    const prisma = buildPrisma();
    const controller = await buildController(prisma);

    const result = await controller.check();

    expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
    expect(result.status).toBe('ok');
    expect(result.details.database).toEqual({ status: 'up' });
  });

  it('throws 503 when the database is unreachable, so Railway knows to restart the instance', async () => {
    const prisma = buildPrisma({ queryRawUnsafe: jest.fn().mockRejectedValue(new Error('connection refused')) });
    const controller = await buildController(prisma);

    await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
  });
});

describe('HealthController.live', () => {
  it('returns ok without touching the database', async () => {
    const prisma = buildPrisma();
    const controller = await buildController(prisma);

    expect(controller.live()).toEqual({ status: 'ok' });
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });
});
