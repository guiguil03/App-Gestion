import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import { ReportsService } from '@/modules/reports/reports.service';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HISTORY_STATUSES = new Set(['present', 'late', 'absent']);

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly tenant: TenantContext,
  ) {}

  @Get('attendance-summary')
  @Roles('DIRECTION', 'ADMIN')
  attendanceSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('schoolClassId') schoolClassId?: string,
  ) {
    if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
      throw new BadRequestException('startDate et endDate sont requis au format YYYY-MM-DD');
    }
    return this.reportsService.attendanceSummary(this.tenant.schoolId, schoolClassId, startDate, endDate);
  }

  @Get('history')
  @Roles('DIRECTION', 'ADMIN')
  attendanceHistory(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('schoolClassId') schoolClassId?: string,
    @Query('studentId') studentId?: string,
    @Query('status') status?: string,
  ) {
    if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
      throw new BadRequestException('startDate et endDate sont requis au format YYYY-MM-DD');
    }
    if (status && !HISTORY_STATUSES.has(status)) {
      throw new BadRequestException('status doit être "present", "late" ou "absent"');
    }

    return this.reportsService.attendanceHistory(this.tenant.schoolId, {
      schoolClassId,
      studentId,
      status: status as 'present' | 'late' | 'absent' | undefined,
      startDate,
      endDate,
    });
  }
}
