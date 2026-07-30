import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import { AuditService } from '@/modules/audit/audit.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly tenant: TenantContext,
  ) {}

  @Get()
  @Roles('DIRECTION', 'ADMIN')
  list(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.list(this.tenant.schoolId, {
      startDate,
      endDate,
      action,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
