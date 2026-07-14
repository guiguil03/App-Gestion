import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { AbsencesService } from '@/modules/absences/absences.service';

@Injectable()
export class AbsenceDetectionJob {
  constructor(private readonly absences: AbsencesService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron(): Promise<void> {
    await this.absences.detectAbsences();
  }
}
