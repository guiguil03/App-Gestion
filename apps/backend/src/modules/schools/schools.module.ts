import { Module } from '@nestjs/common';

import { SchoolLogoStorageService } from '@/modules/schools/school-logo-storage.service';
import { SchoolsController } from '@/modules/schools/schools.controller';
import { SchoolsService } from '@/modules/schools/schools.service';

@Module({
  providers: [SchoolsService, SchoolLogoStorageService],
  controllers: [SchoolsController],
  exports: [SchoolsService],
})
export class SchoolsModule {}
