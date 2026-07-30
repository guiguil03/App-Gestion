import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import { AuditService } from '@/modules/audit/audit.service';
import type { AuthenticatedUser } from '@/modules/auth/types';
import { CreateStaffDto } from '@/modules/staff/dto/create-staff.dto';
import { StaffService } from '@/modules/staff/staff.service';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly tenant: TenantContext,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('DIRECTION', 'ADMIN')
  list() {
    return this.staffService.list(this.tenant.schoolId);
  }

  // Retourne le mot de passe en clair une seule fois : à noter/transmettre
  // immédiatement, non récupérable ensuite (même UX que le provisioning élève/parent).
  @Post()
  @Roles('DIRECTION', 'ADMIN')
  create(@Body() dto: CreateStaffDto) {
    return this.staffService.create(dto, this.tenant.schoolId);
  }

  @Patch(':userId/disable')
  @Roles('DIRECTION', 'ADMIN')
  async disable(@Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.staffService.disable(userId, this.tenant.schoolId, user.userId);
    await this.audit.log({
      schoolId: this.tenant.schoolId,
      userId: user.userId,
      username: user.username,
      role: user.role,
      action: 'staff.disable',
      targetType: 'user',
      targetId: userId,
    });
    return result;
  }
}
