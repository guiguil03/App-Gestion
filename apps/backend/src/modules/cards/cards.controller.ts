import { Controller, Param, Post, UseGuards } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import { CardsService } from '@/modules/cards/cards.service';

@Controller('cards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CardsController {
  constructor(
    private readonly cardsService: CardsService,
    private readonly tenant: TenantContext,
  ) {}

  @Post(':studentId/issue')
  @Roles('DIRECTION')
  issue(@Param('studentId') studentId: string) {
    return this.cardsService.issueCard(studentId, this.tenant.schoolId);
  }

  @Post(':cardId/revoke')
  @Roles('DIRECTION')
  revoke(@Param('cardId') cardId: string) {
    return this.cardsService.revokeCard(cardId, this.tenant.schoolId);
  }
}
