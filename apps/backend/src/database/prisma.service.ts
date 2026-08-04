import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { createTenantScopeMiddleware } from '@/database/tenant-scope.guard';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    // Mode "warn" pour l'instant : plusieurs requêtes existantes suivent le
    // pattern légitime "vérifier l'appartenance via assertBelongsToSchool,
    // puis muter par id seul" sans schoolId dans la requête finale — passer
    // en "throw" cassrait ces cas sans filet de tests d'intégration pour les
    // valider un par un. Le mode warn donne déjà la visibilité en prod.
    this.$use(createTenantScopeMiddleware({ mode: 'warn', logger: this.logger }));
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
