import { Module } from '@nestjs/common';

import { CardsModule } from '@/modules/cards/cards.module';
import { AdminSchoolsController } from '@/modules/admin/admin-schools.controller';
import { AdminSchoolsService } from '@/modules/admin/admin-schools.service';

@Module({
  imports: [CardsModule],
  controllers: [AdminSchoolsController],
  providers: [AdminSchoolsService],
})
export class AdminModule {}
