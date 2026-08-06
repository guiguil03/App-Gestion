import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';

import { PrismaService } from '@/database/prisma.service';

// Volontairement sans JwtAuthGuard : Railway (et tout load balancer externe)
// doit pouvoir l'appeler sans authentification pour décider de redémarrer
// l'instance — voir railway healthcheckPath.
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  // Readiness : l'instance peut-elle servir du trafic (DB comprise) ? C'est
  // cette route que Railway appelle pour décider de redémarrer l'instance.
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.prismaIndicator.pingCheck('database', this.prisma)]);
  }

  // Liveness : le process est-il vivant, indépendamment de ses dépendances
  // externes ? Permet à un orchestrateur de distinguer "instance plantée"
  // de "DB temporairement injoignable" si besoin d'un traitement différent.
  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
