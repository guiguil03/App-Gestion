import { Module } from '@nestjs/common';

import { StudentsController } from '@/modules/students/students.controller';
import { StudentsService } from '@/modules/students/students.service';

@Module({
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
