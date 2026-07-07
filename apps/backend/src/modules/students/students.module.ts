import { Module } from '@nestjs/common';

import { StudentsService } from '@/modules/students/students.service';

@Module({
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
