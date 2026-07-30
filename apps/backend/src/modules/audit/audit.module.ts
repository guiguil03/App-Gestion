import { Global, Module } from '@nestjs/common';

import { AuditController } from '@/modules/audit/audit.controller';
import { AuditService } from '@/modules/audit/audit.service';

// @Global() : AuditService est injecté depuis des modules très divers
// (auth, students, staff, cards...) pour journaliser des actions sensibles —
// éviter de réimporter AuditModule partout où un audit ponctuel est ajouté.
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
