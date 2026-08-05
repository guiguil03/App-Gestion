import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';

// Volontairement sans JwtAuthGuard : Railway (et tout load balancer externe)
// doit pouvoir l'appeler sans authentification pour décider de redémarrer
// l'instance — voir railway healthcheckPath.
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Base de données injoignable');
    }
    return { status: 'ok' };
  }
}
