import { Module } from '@nestjs/common';

import { SchoolsService } from '@/modules/schools/schools.service';

@Module({
  providers: [SchoolsService],
  exports: [SchoolsService],
})
export class SchoolsModule {}
