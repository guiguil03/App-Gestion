import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';
import type { CreateClosureDateDto } from '@/modules/schools/dto/create-closure-date.dto';
import type { UpdateAttendanceSettingsDto } from '@/modules/schools/dto/update-attendance-settings.dto';
import type { UpdateSchoolProfileDto } from '@/modules/schools/dto/update-school-profile.dto';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdOrThrow(schoolId: string) {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('École introuvable');
    return school;
  }

  async getProfile(schoolId: string) {
    const school = await this.findByIdOrThrow(schoolId);
    return {
      name: school.name,
      address: school.address,
      directorName: school.directorName,
      logoUrl: school.logoUrl,
    };
  }

  async updateProfile(schoolId: string, dto: UpdateSchoolProfileDto) {
    await this.findByIdOrThrow(schoolId);
    const school = await this.prisma.school.update({
      where: { id: schoolId },
      data: {
        name: dto.name,
        address: dto.address,
        directorName: dto.directorName,
      },
    });
    return {
      name: school.name,
      address: school.address,
      directorName: school.directorName,
      logoUrl: school.logoUrl,
    };
  }

  async setLogo(schoolId: string, logoUrl: string) {
    await this.findByIdOrThrow(schoolId);
    const school = await this.prisma.school.update({ where: { id: schoolId }, data: { logoUrl } });
    return { logoUrl: school.logoUrl };
  }

  async getAttendanceSettings(schoolId: string) {
    const school = await this.findByIdOrThrow(schoolId);
    return {
      scanWindowStart: school.scanWindowStart,
      scanWindowEnd: school.scanWindowEnd,
      attendanceReferenceTime: school.attendanceReferenceTime,
      attendanceToleranceMinutes: school.attendanceToleranceMinutes,
      closedWeekdays: school.closedWeekdays,
      consecutiveAbsenceAlertThreshold: school.consecutiveAbsenceAlertThreshold,
    };
  }

  async updateAttendanceSettings(schoolId: string, dto: UpdateAttendanceSettingsDto) {
    await this.findByIdOrThrow(schoolId);

    const school = await this.prisma.school.update({
      where: { id: schoolId },
      data: {
        scanWindowStart: dto.scanWindowStart,
        scanWindowEnd: dto.scanWindowEnd,
        attendanceReferenceTime: dto.attendanceReferenceTime,
        attendanceToleranceMinutes: dto.attendanceToleranceMinutes,
        closedWeekdays: dto.closedWeekdays,
        consecutiveAbsenceAlertThreshold: dto.consecutiveAbsenceAlertThreshold,
      },
    });
    return {
      scanWindowStart: school.scanWindowStart,
      scanWindowEnd: school.scanWindowEnd,
      attendanceReferenceTime: school.attendanceReferenceTime,
      attendanceToleranceMinutes: school.attendanceToleranceMinutes,
      closedWeekdays: school.closedWeekdays,
      consecutiveAbsenceAlertThreshold: school.consecutiveAbsenceAlertThreshold,
    };
  }

  async listClosureDates(schoolId: string) {
    return this.prisma.schoolClosureDate.findMany({ where: { schoolId }, orderBy: { date: 'asc' } });
  }

  async addClosureDate(schoolId: string, dto: CreateClosureDateDto) {
    await this.findByIdOrThrow(schoolId);
    return this.prisma.schoolClosureDate.upsert({
      where: { schoolId_date: { schoolId, date: dto.date } },
      create: { schoolId, date: dto.date, label: dto.label },
      update: { label: dto.label },
    });
  }

  async removeClosureDate(schoolId: string, closureDateId: string): Promise<void> {
    const result = await this.prisma.schoolClosureDate.deleteMany({ where: { id: closureDateId, schoolId } });
    if (result.count === 0) throw new NotFoundException('Date de fermeture introuvable');
  }
}
