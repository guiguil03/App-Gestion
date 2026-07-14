import { Module } from '@nestjs/common';

import { AbsenceDetectionJob } from '@/modules/absences/absence-detection.job';
import { AbsencesController } from '@/modules/absences/absences.controller';
import { AbsencesService } from '@/modules/absences/absences.service';

@Module({
  providers: [AbsencesService, AbsenceDetectionJob],
  controllers: [AbsencesController],
  exports: [AbsencesService],
})
export class AbsencesModule {}
