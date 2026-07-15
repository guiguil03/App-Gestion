import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import { CreateStaffDto } from '@/modules/staff/dto/create-staff.dto';
import { StaffService } from '@/modules/staff/staff.service';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly tenant: TenantContext,
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
  disable(@Param('userId') userId: string) {
    return this.staffService.disable(userId, this.tenant.schoolId);
  }
}
