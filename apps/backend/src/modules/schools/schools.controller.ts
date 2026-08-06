import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import { detectImageExtension } from '@/modules/students/image-signature';
import { CreateClosureDateDto } from '@/modules/schools/dto/create-closure-date.dto';
import { CreateSchoolEventDto } from '@/modules/schools/dto/create-school-event.dto';
import { UpdateAttendanceSettingsDto } from '@/modules/schools/dto/update-attendance-settings.dto';
import { UpdateSchoolProfileDto } from '@/modules/schools/dto/update-school-profile.dto';
import { SchoolLogoStorageService } from '@/modules/schools/school-logo-storage.service';
import { SchoolsService } from '@/modules/schools/schools.service';

const ALLOWED_LOGO_MIMETYPES = new Set(['image/jpeg', 'image/png']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

@Controller('schools')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchoolsController {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly logoStorage: SchoolLogoStorageService,
    private readonly tenant: TenantContext,
  ) {}

  @Get('profile')
  @Roles('DIRECTION', 'ADMIN')
  getProfile() {
    return this.schoolsService.getProfile(this.tenant.schoolId);
  }

  @Patch('profile')
  @Roles('DIRECTION', 'ADMIN')
  updateProfile(@Body() dto: UpdateSchoolProfileDto) {
    return this.schoolsService.updateProfile(this.tenant.schoolId, dto);
  }

  @Post('logo')
  @Roles('DIRECTION', 'ADMIN')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: memoryStorage(),
      fileFilter: (_req, file, callback) => {
        callback(null, ALLOWED_LOGO_MIMETYPES.has(file.mimetype));
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadLogo(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Logo manquant ou format non supporté (jpg/png uniquement)');
    }
    const ext = detectImageExtension(file.buffer);
    if (!ext) {
      throw new BadRequestException("Le fichier envoyé n'est pas une image JPEG ou PNG valide");
    }

    const filename = `${this.tenant.schoolId}${ext}`;
    const logoUrl = await this.logoStorage.upload(file.buffer, filename, ext);
    return this.schoolsService.setLogo(this.tenant.schoolId, logoUrl);
  }

  @Get('attendance-settings')
  @Roles('DIRECTION', 'ADMIN')
  getAttendanceSettings() {
    return this.schoolsService.getAttendanceSettings(this.tenant.schoolId);
  }

  @Patch('attendance-settings')
  @Roles('DIRECTION', 'ADMIN')
  updateAttendanceSettings(@Body() dto: UpdateAttendanceSettingsDto) {
    return this.schoolsService.updateAttendanceSettings(this.tenant.schoolId, dto);
  }

  @Get('closure-dates')
  @Roles('DIRECTION', 'ADMIN')
  listClosureDates() {
    return this.schoolsService.listClosureDates(this.tenant.schoolId);
  }

  @Post('closure-dates')
  @Roles('DIRECTION', 'ADMIN')
  addClosureDate(@Body() dto: CreateClosureDateDto) {
    return this.schoolsService.addClosureDate(this.tenant.schoolId, dto);
  }

  @Delete('closure-dates/:closureDateId')
  @Roles('DIRECTION', 'ADMIN')
  removeClosureDate(@Param('closureDateId') closureDateId: string) {
    return this.schoolsService.removeClosureDate(this.tenant.schoolId, closureDateId);
  }

  @Get('events')
  @Roles('DIRECTION', 'ADMIN')
  listEvents(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
      throw new BadRequestException('startDate et endDate sont requis au format YYYY-MM-DD');
    }
    return this.schoolsService.listEvents(this.tenant.schoolId, startDate, endDate);
  }

  @Post('events')
  @Roles('DIRECTION', 'ADMIN')
  addEvent(@Body() dto: CreateSchoolEventDto) {
    return this.schoolsService.addEvent(this.tenant.schoolId, dto);
  }

  @Delete('events/:eventId')
  @Roles('DIRECTION', 'ADMIN')
  removeEvent(@Param('eventId') eventId: string) {
    return this.schoolsService.removeEvent(this.tenant.schoolId, eventId);
  }
}
