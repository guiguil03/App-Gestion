import { Module } from '@nestjs/common';

import { StudentPhotoStorageService } from '@/modules/students/student-photo-storage.service';
import { StudentsController } from '@/modules/students/students.controller';
import { StudentsService } from '@/modules/students/students.service';

@Module({
  controllers: [StudentsController],
  providers: [StudentsService, StudentPhotoStorageService],
  exports: [StudentsService],
})
export class StudentsModule {}
