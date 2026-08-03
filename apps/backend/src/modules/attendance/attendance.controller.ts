import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import { AuditService } from '@/modules/audit/audit.service';
import type { AuthenticatedUser } from '@/modules/auth/types';
import { AttendanceService } from '@/modules/attendance/attendance.service';
import { CreateManualAttendanceDto } from '@/modules/attendance/dto/create-manual-attendance.dto';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly tenant: TenantContext,
    private readonly audit: AuditService,
  ) {}

  // Pointages bruts d'une journée — page Présences du dashboard.
  @Get()
  @Roles('DIRECTION', 'ADMIN')
  listForDay(
    @Query('date') date: string,
    @Query('schoolClassId') schoolClassId?: string,
    @Query('search') search?: string,
  ) {
    if (!DATE_PATTERN.test(date)) {
      throw new BadRequestException('date est requis au format YYYY-MM-DD');
    }
    return this.attendanceService.listForDay(this.tenant.schoolId, { date, schoolClassId, search });
  }

  // Correction manuelle depuis la fiche élève (dashboard) — voir le
  // commentaire de AttendanceService.recordManual pour le pourquoi (pointage
  // mobile oublié). Réservé à la Direction : override libre, sans
  // vérification de périmètre/horaire.
  @Post(':studentId')
  @Roles('DIRECTION', 'ADMIN')
  async recordManual(
    @Param('studentId') studentId: string,
    @Body() dto: CreateManualAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.attendanceService.recordManual(studentId, this.tenant.schoolId, dto);
    await this.audit.log({
      schoolId: this.tenant.schoolId,
      userId: user.userId,
      username: user.username,
      role: user.role,
      action: 'attendance.manual_record',
      targetType: 'student',
      targetId: studentId,
      metadata: { date: dto.date, time: dto.time, isLate: dto.isLate },
    });
    return result;
  }
}
