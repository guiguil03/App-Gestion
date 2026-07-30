import { Module } from '@nestjs/common';

import { CardsModule } from '@/modules/cards/cards.module';
import { AdminAccountsController } from '@/modules/admin/admin-accounts.controller';
import { AdminAccountsService } from '@/modules/admin/admin-accounts.service';
import { AdminSchoolsController } from '@/modules/admin/admin-schools.controller';
import { AdminSchoolsService } from '@/modules/admin/admin-schools.service';

@Module({
  imports: [CardsModule],
  controllers: [AdminSchoolsController, AdminAccountsController],
  providers: [AdminSchoolsService, AdminAccountsService],
})
export class AdminModule {}
