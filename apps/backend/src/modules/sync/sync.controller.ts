import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import type { AuthenticatedUser } from '@/modules/auth/types';
import type { PushChangesBody } from '@/modules/sync/dto/push-changes.dto';
import { SyncService } from '@/modules/sync/sync.service';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly tenant: TenantContext,
  ) {}

  @Get('pull')
  pull(@CurrentUser() user: AuthenticatedUser, @Query('lastPulledAt') lastPulledAt?: string) {
    return this.syncService.pull(this.tenant.schoolId, user, lastPulledAt ? Number(lastPulledAt) : 0);
  }

  @Post('push')
  push(@CurrentUser() user: AuthenticatedUser, @Body() body: PushChangesBody) {
    return this.syncService.push(user, body.changes);
  }
}
