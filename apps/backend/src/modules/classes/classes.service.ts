import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';
import type { CreateClassDto } from '@/modules/classes/dto/create-class.dto';
import type { UpdateClassDto } from '@/modules/classes/dto/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  list(schoolId: string) {
    return this.prisma.schoolClass.findMany({
      where: { schoolId, deletedAt: null },
      include: { assignedTeachers: true },
      orderBy: { name: 'asc' },
    });
  }

  create(dto: CreateClassDto, schoolId: string) {
    return this.prisma.schoolClass.create({ data: { name: dto.name, promotion: dto.promotion, schoolId } });
  }

  async update(classId: string, dto: UpdateClassDto, schoolId: string) {
    await this.assertBelongsToSchool(classId, schoolId);
    return this.prisma.schoolClass.update({ where: { id: classId }, data: dto });
  }

  async remove(classId: string, schoolId: string) {
    await this.assertBelongsToSchool(classId, schoolId);
    return this.prisma.schoolClass.update({ where: { id: classId }, data: { deletedAt: new Date() } });
  }

  async assignTeacher(classId: string, userId: string, schoolId: string) {
    await this.assertBelongsToSchool(classId, schoolId);
    const teacher = await this.prisma.user.findFirst({
      where: { id: userId, schoolId, role: { in: ['ENSEIGNANT', 'SURVEILLANT'] } },
    });
    if (!teacher) throw new NotFoundException('Enseignant/surveillant introuvable dans cette école');
    return this.prisma.schoolClass.update({
      where: { id: classId },
      data: { assignedTeachers: { connect: { id: userId } } },
    });
  }

  async unassignTeacher(classId: string, userId: string, schoolId: string) {
    await this.assertBelongsToSchool(classId, schoolId);
    return this.prisma.schoolClass.update({
      where: { id: classId },
      data: { assignedTeachers: { disconnect: { id: userId } } },
    });
  }

  private async assertBelongsToSchool(classId: string, schoolId: string) {
    const schoolClass = await this.prisma.schoolClass.findFirst({ where: { id: classId, schoolId, deletedAt: null } });
    if (!schoolClass) throw new ForbiddenException("Classe hors du périmètre de l'école");
    return schoolClass;
  }
}
