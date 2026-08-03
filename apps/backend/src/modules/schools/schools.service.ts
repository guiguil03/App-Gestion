import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';
import type { UpdateAttendanceSettingsDto } from '@/modules/schools/dto/update-attendance-settings.dto';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdOrThrow(schoolId: string) {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('École introuvable');
    return school;
  }

  async getAttendanceSettings(schoolId: string) {
    const school = await this.findByIdOrThrow(schoolId);
    return {
      scanWindowStart: school.scanWindowStart,
      scanWindowEnd: school.scanWindowEnd,
      attendanceReferenceTime: school.attendanceReferenceTime,
      attendanceToleranceMinutes: school.attendanceToleranceMinutes,
    };
  }

  async updateAttendanceSettings(schoolId: string, dto: UpdateAttendanceSettingsDto) {
    await this.findByIdOrThrow(schoolId);

    const school = await this.prisma.school.update({
      where: { id: schoolId },
      data: {
        scanWindowStart: dto.scanWindowStart,
        scanWindowEnd: dto.scanWindowEnd,
      },
    });
    return {
      scanWindowStart: school.scanWindowStart,
      scanWindowEnd: school.scanWindowEnd,
    };
  }
}
