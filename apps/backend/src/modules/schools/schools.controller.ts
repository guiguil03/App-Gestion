import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import { UpdateAttendanceSettingsDto } from '@/modules/schools/dto/update-attendance-settings.dto';
import { SchoolsService } from '@/modules/schools/schools.service';

@Controller('schools')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchoolsController {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly tenant: TenantContext,
  ) {}

  @Get('attendance-settings')
  @Roles('DIRECTION', 'ADMIN')
  getAttendanceSettings() {
    return this.schoolsService.getAttendanceSettings(this.tenant.schoolId);
  }

  @Patch('attendance-settings')
  @Roles('DIRECTION', 'ADMIN')
  updateAttendanceSettings(@Body() dto: UpdateAttendanceSettingsDto) {
    return this.schoolsService.updateAttendanceSettings(this.tenant.schoolId, dto);
  }
}
