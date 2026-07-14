import { Module } from '@nestjs/common';

import { ClassesController } from '@/modules/classes/classes.controller';
import { ClassesService } from '@/modules/classes/classes.service';

@Module({
  providers: [ClassesService],
  controllers: [ClassesController],
  exports: [ClassesService],
})
export class ClassesModule {}
