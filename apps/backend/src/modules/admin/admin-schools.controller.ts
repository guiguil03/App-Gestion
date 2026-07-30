import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { AdminSchoolsService } from '@/modules/admin/admin-schools.service';
import { AuditService } from '@/modules/audit/audit.service';
import type { AuthenticatedUser } from '@/modules/auth/types';
import { CreateSchoolDto } from '@/modules/admin/dto/create-school.dto';
import { UpdateSchoolDto } from '@/modules/admin/dto/update-school.dto';

@Controller('admin/schools')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSchoolsController {
  constructor(
    private readonly adminSchoolsService: AdminSchoolsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list() {
    return this.adminSchoolsService.list();
  }

  @Post()
  async create(@Body() dto: CreateSchoolDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.adminSchoolsService.create(dto);
    await this.audit.log({
      userId: user.userId,
      username: user.username,
      role: user.role,
      action: 'admin.school.create',
      targetType: 'school',
      targetId: result.school.id,
      metadata: { name: result.school.name },
    });
    return result;
  }

  @Patch(':schoolId')
  async update(@Param('schoolId') schoolId: string, @Body() dto: UpdateSchoolDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.adminSchoolsService.update(schoolId, dto);
    await this.audit.log({
      userId: user.userId,
      username: user.username,
      role: user.role,
      action: 'admin.school.update',
      targetType: 'school',
      targetId: schoolId,
      metadata: { name: dto.name },
    });
    return result;
  }

  @Patch(':schoolId/deactivate')
  async deactivate(@Param('schoolId') schoolId: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.adminSchoolsService.deactivate(schoolId);
    await this.audit.log({
      userId: user.userId,
      username: user.username,
      role: user.role,
      action: 'admin.school.deactivate',
      targetType: 'school',
      targetId: schoolId,
    });
    return result;
  }
}
