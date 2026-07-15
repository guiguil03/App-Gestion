import { Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import type { AuthenticatedUser } from '@/modules/auth/types';
import { CardsService } from '@/modules/cards/cards.service';

@Controller('cards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CardsController {
  constructor(
    private readonly cardsService: CardsService,
    private readonly tenant: TenantContext,
  ) {}

  @Post(':studentId/issue')
  @Roles('DIRECTION', 'ADMIN')
  issue(@Param('studentId') studentId: string) {
    return this.cardsService.issueCard(studentId, this.tenant.schoolId);
  }

  // Déclaré avant `:studentId` — sinon "me" serait capturé comme un id.
  @Get('me')
  @Roles('ELEVE')
  getMyCard(@CurrentUser() user: AuthenticatedUser) {
    if (!user.studentId) {
      throw new ForbiddenException('Ce compte ne correspond à aucun élève');
    }
    return this.cardsService.getActiveCard(user.studentId, this.tenant.schoolId);
  }

  @Get(':studentId')
  @Roles('DIRECTION', 'ADMIN')
  getActive(@Param('studentId') studentId: string) {
    return this.cardsService.getActiveCard(studentId, this.tenant.schoolId);
  }

  @Post(':cardId/revoke')
  @Roles('DIRECTION', 'ADMIN')
  revoke(@Param('cardId') cardId: string) {
    return this.cardsService.revokeCard(cardId, this.tenant.schoolId);
  }
}
