import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
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
import { memoryStorage } from 'multer';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import { AuditService } from '@/modules/audit/audit.service';
import type { AuthenticatedUser } from '@/modules/auth/types';
import { CreateStudentDto } from '@/modules/students/dto/create-student.dto';
import { detectImageExtension } from '@/modules/students/image-signature';
import { StudentPhotoStorageService } from '@/modules/students/student-photo-storage.service';
import { UpdateStudentDto } from '@/modules/students/dto/update-student.dto';
import { StudentsService } from '@/modules/students/students.service';

const ALLOWED_PHOTO_MIMETYPES = new Set(['image/jpeg', 'image/png']);

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly tenant: TenantContext,
    private readonly photoStorage: StudentPhotoStorageService,
    private readonly audit: AuditService,
  ) {}

  // Rétro-compatible : sans `page`, renvoie le tableau complet comme avant
  // (utilisé par l'app mobile et par les filtres qui ont besoin du roster
  // entier). Avec `page`, bascule sur la pagination + recherche serveur
  // (utilisé par la page Élèves du dashboard).
  @Get()
  @Roles('DIRECTION', 'ADMIN')
  list(
    @Query('schoolClassId') schoolClassId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    if (page === undefined) {
      return this.studentsService.listStudents(this.tenant.schoolId, schoolClassId);
    }
    return this.studentsService.listStudentsPaginated(this.tenant.schoolId, {
      schoolClassId,
      search,
      page: Math.max(1, Number(page) || 1),
      pageSize: Math.min(100, Math.max(1, Number(pageSize) || 25)),
    });
  }

  // Déclaré avant `:studentId` — sinon "me" serait capturé comme un id.
  @Get('me')
  @Roles('ELEVE')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    if (!user.studentId) {
      throw new ForbiddenException('Ce compte ne correspond à aucun élève');
    }
    return this.studentsService.getStudent(user.studentId, this.tenant.schoolId);
  }

  @Get(':studentId')
  @Roles('DIRECTION', 'ADMIN', 'PARENT')
  async get(@Param('studentId') studentId: string, @CurrentUser() user: AuthenticatedUser) {
    if (user.role === 'PARENT') {
      await this.studentsService.assertParentOwnsStudent(user.userId, studentId);
    }
    return this.studentsService.getStudent(studentId, this.tenant.schoolId);
  }

  @Post()
  @Roles('DIRECTION', 'ADMIN')
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.createStudent(dto, this.tenant.schoolId);
  }

  @Patch(':studentId')
  @Roles('DIRECTION', 'ADMIN', 'PARENT')
  async update(
    @Param('studentId') studentId: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.role === 'PARENT') {
      await this.studentsService.assertParentOwnsStudent(user.userId, studentId);
    }
    return this.studentsService.updateStudent(studentId, dto, this.tenant.schoolId);
  }

  @Post(':studentId/photo')
  @Roles('DIRECTION', 'ADMIN', 'PARENT')
  @UseInterceptors(
    FileInterceptor('photo', {
      // Buffer en mémoire, jamais écrit sur disque tel quel : le nom de
      // fichier et le Content-Type déclarés par le client sont falsifiables,
      // seul le contenu binaire reçu fait foi (cf. detectImageExtension).
      storage: memoryStorage(),
      fileFilter: (_req, file, callback) => {
        callback(null, ALLOWED_PHOTO_MIMETYPES.has(file.mimetype));
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadPhoto(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (user.role === 'PARENT') {
      await this.studentsService.assertParentOwnsStudent(user.userId, studentId);
    }
    await this.studentsService.assertBelongsToSchool(studentId, this.tenant.schoolId);

    if (!file) {
      throw new BadRequestException('Photo manquante ou format non supporté (jpg/png uniquement)');
    }

    const ext = detectImageExtension(file.buffer);
    if (!ext) {
      throw new BadRequestException("Le fichier envoyé n'est pas une image JPEG ou PNG valide");
    }

    const filename = `${randomUUID()}${ext}`;
    const photoUrl = await this.photoStorage.upload(file.buffer, filename, ext);

    return this.studentsService.setPhoto(studentId, this.tenant.schoolId, photoUrl);
  }

  // Retourne le mot de passe en clair une seule fois : à noter/transmettre
  // immédiatement par la direction, non récupérable ensuite.
  @Post(':studentId/account')
  @Roles('DIRECTION', 'ADMIN')
  async provisionAccount(@Param('studentId') studentId: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.studentsService.provisionAccount(studentId, this.tenant.schoolId);
    await this.audit.log({
      schoolId: this.tenant.schoolId,
      userId: user.userId,
      username: user.username,
      role: user.role,
      action: 'students.provision_account',
      targetType: 'student',
      targetId: studentId,
    });
    return result;
  }

  // Retourne le mot de passe en clair une seule fois (idem provisionAccount)
  // — `password: null` si un compte parent existant a été réutilisé (fratrie).
  @Post(':studentId/parents/:parentGuardianId/account')
  @Roles('DIRECTION', 'ADMIN')
  async provisionParentAccount(
    @Param('studentId') studentId: string,
    @Param('parentGuardianId') parentGuardianId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.studentsService.provisionParentAccount(studentId, parentGuardianId, this.tenant.schoolId);
    await this.audit.log({
      schoolId: this.tenant.schoolId,
      userId: user.userId,
      username: user.username,
      role: user.role,
      action: 'students.provision_parent_account',
      targetType: 'student',
      targetId: studentId,
      metadata: { parentGuardianId, reused: result.reused },
    });
    return result;
  }
}
