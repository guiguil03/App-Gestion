import { Module } from '@nestjs/common';

import { AttendanceModule } from '@/modules/attendance/attendance.module';
import { SyncController } from '@/modules/sync/sync.controller';
import { SyncService } from '@/modules/sync/sync.service';

@Module({
  imports: [AttendanceModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
