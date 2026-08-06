import { Module } from '@nestjs/common';

import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { ReportsController } from '@/modules/reports/reports.controller';
import { ReportsService } from '@/modules/reports/reports.service';
import { WeeklyReportJob } from '@/modules/reports/weekly-report.job';

@Module({
  imports: [NotificationsModule],
  controllers: [ReportsController],
  providers: [ReportsService, WeeklyReportJob],
})
export class ReportsModule {}
