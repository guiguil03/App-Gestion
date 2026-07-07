import { Module } from '@nestjs/common';

import { StudentsModule } from '@/modules/students/students.module';
import { AttendanceSessionsService } from '@/modules/attendance/attendance-sessions.service';
import { AttendanceService } from '@/modules/attendance/attendance.service';
import { LateDetectionService } from '@/modules/attendance/late-detection.service';

@Module({
  imports: [StudentsModule],
  providers: [AttendanceService, AttendanceSessionsService, LateDetectionService],
  exports: [AttendanceService, AttendanceSessionsService],
})
export class AttendanceModule {}
