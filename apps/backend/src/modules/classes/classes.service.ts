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
      include: { assignedTeachers: { select: { id: true, username: true, role: true } } },
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

  /**
   * Import en masse (nom, promotion) — typiquement juste après la création
   * d'une école, pour peupler ses classes sans les créer une par une. Idempotent
   * par (nom, promotion) insensible à la casse : relancer le même fichier ne
   * duplique pas les classes déjà importées, permettant de corriger un
   * fichier partiellement en erreur et de le réimporter tel quel.
   */
  async importBulk(rows: Record<string, string>[], schoolId: string) {
    const existing = await this.prisma.schoolClass.findMany({
      where: { schoolId, deletedAt: null },
      select: { name: true, promotion: true },
    });
    const existingKeys = new Set(existing.map((c) => `${c.name.trim().toLowerCase()}|${c.promotion.trim().toLowerCase()}`));

    let created = 0;
    let skipped = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const name = rows[i].name?.trim();
      const promotion = rows[i].promotion?.trim();

      if (!name || !promotion) {
        errors.push({ row: i + 1, message: 'Nom et promotion requis' });
        continue;
      }

      const key = `${name.toLowerCase()}|${promotion.toLowerCase()}`;
      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }

      await this.prisma.schoolClass.create({ data: { name, promotion, schoolId } });
      existingKeys.add(key);
      created++;
    }

    return { created, skipped, errors };
  }

  private async assertBelongsToSchool(classId: string, schoolId: string) {
    const schoolClass = await this.prisma.schoolClass.findFirst({ where: { id: classId, schoolId, deletedAt: null } });
    if (!schoolClass) throw new ForbiddenException("Classe hors du périmètre de l'école");
    return schoolClass;
  }
}
