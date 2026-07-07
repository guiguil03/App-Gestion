import { Module } from '@nestjs/common';

import { StudentsModule } from '@/modules/students/students.module';
import { AttendanceService } from '@/modules/attendance/attendance.service';
import { LateDetectionService } from '@/modules/attendance/late-detection.service';

@Module({
  imports: [StudentsModule],
  providers: [AttendanceService, LateDetectionService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
