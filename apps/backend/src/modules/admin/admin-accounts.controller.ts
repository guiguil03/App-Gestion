import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { AdminAccountsService } from '@/modules/admin/admin-accounts.service';
import { CreateAdminAccountDto } from '@/modules/admin/dto/create-admin-account.dto';
import type { AuthenticatedUser } from '@/modules/auth/types';

@Controller('admin/accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminAccountsController {
  constructor(private readonly adminAccountsService: AdminAccountsService) {}

  @Get()
  list() {
    return this.adminAccountsService.list();
  }

  // Retourne le mot de passe en clair une seule fois, comme StaffService.create.
  @Post()
  create(@Body() dto: CreateAdminAccountDto) {
    return this.adminAccountsService.create(dto);
  }

  @Patch(':userId/disable')
  disable(@Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adminAccountsService.disable(userId, user.userId);
  }
}
