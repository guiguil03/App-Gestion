import { Module } from '@nestjs/common';

import { StaffController } from '@/modules/staff/staff.controller';
import { StaffService } from '@/modules/staff/staff.service';

@Module({
  providers: [StaffService],
  controllers: [StaffController],
  exports: [StaffService],
})
export class StaffModule {}
