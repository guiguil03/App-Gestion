import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

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
      geofenceCorners: school.geofenceCorners,
      scanWindowStart: school.scanWindowStart,
      scanWindowEnd: school.scanWindowEnd,
    };
  }

  async updateAttendanceSettings(schoolId: string, dto: UpdateAttendanceSettingsDto) {
    await this.findByIdOrThrow(schoolId);

    // Prisma exige le sentinel `Prisma.JsonNull` (pas le `null` JS) pour
    // mettre une colonne JSON à SQL NULL — un `null` JS signifierait "ne pas
    // toucher au champ", à l'inverse de ce qu'on veut ici.
    let geofenceCorners: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
    if (dto.geofenceCorners === undefined) {
      geofenceCorners = undefined;
    } else if (dto.geofenceCorners === null) {
      geofenceCorners = Prisma.JsonNull;
    } else {
      geofenceCorners = dto.geofenceCorners as unknown as Prisma.InputJsonValue;
    }

    const school = await this.prisma.school.update({
      where: { id: schoolId },
      data: {
        geofenceCorners,
        scanWindowStart: dto.scanWindowStart,
        scanWindowEnd: dto.scanWindowEnd,
      },
    });
    return {
      geofenceCorners: school.geofenceCorners,
      scanWindowStart: school.scanWindowStart,
      scanWindowEnd: school.scanWindowEnd,
    };
  }
}
