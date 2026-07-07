import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import { CreateStudentDto } from '@/modules/students/dto/create-student.dto';
import { UpdateStudentDto } from '@/modules/students/dto/update-student.dto';
import { StudentsService } from '@/modules/students/students.service';

const ALLOWED_PHOTO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly tenant: TenantContext,
  ) {}

  @Get()
  @Roles('DIRECTION')
  list(@Query('schoolClassId') schoolClassId?: string) {
    return this.studentsService.listStudents(this.tenant.schoolId, schoolClassId);
  }

  @Get(':studentId')
  @Roles('DIRECTION')
  get(@Param('studentId') studentId: string) {
    return this.studentsService.getStudent(studentId, this.tenant.schoolId);
  }

  @Post()
  @Roles('DIRECTION')
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.createStudent(dto, this.tenant.schoolId);
  }

  @Patch(':studentId')
  @Roles('DIRECTION')
  update(@Param('studentId') studentId: string, @Body() dto: UpdateStudentDto) {
    return this.studentsService.updateStudent(studentId, dto, this.tenant.schoolId);
  }

  @Post(':studentId/photo')
  @Roles('DIRECTION')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './uploads/students',
        filename: (_req, file, callback) => {
          const ext = extname(file.originalname).toLowerCase();
          if (!ALLOWED_PHOTO_EXTENSIONS.has(ext)) {
            callback(new BadRequestException('Format de photo non supporté (jpg/png uniquement)'), '');
            return;
          }
          callback(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadPhoto(@Param('studentId') studentId: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Photo manquante');
    }
    return this.studentsService.setPhoto(studentId, this.tenant.schoolId, `/uploads/students/${file.filename}`);
  }

  // Retourne le mot de passe en clair une seule fois : à noter/transmettre
  // immédiatement par la direction, non récupérable ensuite.
  @Post(':studentId/account')
  @Roles('DIRECTION')
  provisionAccount(@Param('studentId') studentId: string) {
    return this.studentsService.provisionAccount(studentId, this.tenant.schoolId);
  }
}
