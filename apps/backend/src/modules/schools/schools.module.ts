import { Module } from '@nestjs/common';

import { SchoolsController } from '@/modules/schools/schools.controller';
import { SchoolsService } from '@/modules/schools/schools.service';

@Module({
  providers: [SchoolsService],
  controllers: [SchoolsController],
  exports: [SchoolsService],
})
export class SchoolsModule {}
