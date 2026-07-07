import { Module } from '@nestjs/common';

import { StudentsModule } from '@/modules/students/students.module';
import { CardSigningService } from '@/modules/cards/card-signing.service';
import { CardsController } from '@/modules/cards/cards.controller';
import { CardsService } from '@/modules/cards/cards.service';

@Module({
  imports: [StudentsModule],
  controllers: [CardsController],
  providers: [CardSigningService, CardsService],
  exports: [CardSigningService, CardsService],
})
export class CardsModule {}
