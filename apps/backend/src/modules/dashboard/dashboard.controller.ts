import { Controller, Get, Query, Sse, UseGuards } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import { DashboardService } from '@/modules/dashboard/dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DIRECTION')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly tenant: TenantContext,
  ) {}

  @Get('overview')
  overview() {
    return this.dashboardService.getOverview(this.tenant.schoolId);
  }

  @Get('classes-comparison')
  classesComparison() {
    return this.dashboardService.getClassesComparison(this.tenant.schoolId);
  }

  @Get('alerts')
  alerts() {
    return this.dashboardService.getAlerts(this.tenant.schoolId);
  }

  @Get('trend')
  trend(@Query('period') period: 'week' | 'month' = 'week') {
    return this.dashboardService.getTrend(this.tenant.schoolId, period === 'month' ? 'month' : 'week');
  }

  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return this.dashboardService.streamFor(this.tenant.schoolId);
  }
}
