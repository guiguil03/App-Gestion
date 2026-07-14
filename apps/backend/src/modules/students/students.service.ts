import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { generatePassword, generateUniqueUsername } from '@/common/accounts/generate-credentials';
import { PrismaService } from '@/database/prisma.service';
import type { CreateStudentDto } from '@/modules/students/dto/create-student.dto';
import type { UpdateStudentDto } from '@/modules/students/dto/update-student.dto';

export type ProvisionedAccount = {
  username: string;
  password: string;
};

export type ProvisionedParentAccount = {
  username: string;
  // `null` quand un compte existant a été réutilisé (fratrie) : le mot de
  // passe existant n'est jamais récupérable, seul un nouveau compte en génère un.
  password: string | null;
  reused: boolean;
};

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Empêche un pointage ou une action sur un élève hors du périmètre de l'école du user courant. */
  async assertBelongsToSchool(studentId: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId, deletedAt: null },
    });
    if (!student) {
      throw new ForbiddenException("Élève hors du périmètre de l'école");
    }
    return student;
  }

  /**
   * Crée (ou régénère) le compte de connexion ELEVE d'un élève. Le mot de
   * passe en clair n'est retourné qu'une fois ici — l'administration doit le
   * noter/transmettre immédiatement, il n'est jamais récupérable ensuite
   * (seul son hash est stocké).
   */
  async provisionAccount(studentId: string, schoolId: string): Promise<ProvisionedAccount> {
    const student = await this.assertBelongsToSchool(studentId, schoolId);

    // Régénération (perte du mot de passe) : on garde l'identifiant existant,
    // seul le mot de passe change.
    const existing = await this.prisma.user.findUnique({ where: { studentId } });
    const username = existing?.username ?? (await generateUniqueUsername(this.prisma, student.firstName, student.lastName));
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.user.upsert({
      where: { studentId },
      create: { username, passwordHash, role: 'ELEVE', schoolId, studentId },
      update: { passwordHash },
    });

    return { username, password };
  }

  /** Empêche un parent de consulter/modifier un enfant qui n'est pas le sien. */
  async assertParentOwnsStudent(userId: string, studentId: string) {
    const link = await this.prisma.user.findFirst({
      where: { id: userId, children: { some: { id: studentId } } },
    });
    if (!link) {
      throw new ForbiddenException("Cet élève n'est pas rattaché à ce compte parent");
    }
  }

  /**
   * Crée (ou régénère) le compte de connexion PARENT lié à un enfant. Si un
   * compte PARENT existe déjà dans l'école pour ce même numéro de téléphone
   * (cas d'une fratrie), on relie simplement ce nouvel enfant à ce compte
   * existant plutôt que d'en créer un second.
   */
  async provisionParentAccount(
    studentId: string,
    parentGuardianId: string,
    schoolId: string,
  ): Promise<ProvisionedParentAccount> {
    await this.assertBelongsToSchool(studentId, schoolId);
    const parentGuardian = await this.prisma.parentGuardian.findFirst({
      where: { id: parentGuardianId, studentId },
    });
    if (!parentGuardian) {
      throw new NotFoundException('Parent introuvable pour cet élève');
    }

    const existingAccount = await this.prisma.user.findFirst({
      where: {
        role: 'PARENT',
        schoolId,
        children: { some: { parents: { some: { phoneNumber: parentGuardian.phoneNumber } } } },
      },
    });

    if (existingAccount) {
      await this.prisma.user.update({
        where: { id: existingAccount.id },
        data: { children: { connect: { id: studentId } } },
      });
      return { username: existingAccount.username, password: null, reused: true };
    }

    const username = await generateUniqueUsername(this.prisma, parentGuardian.fullName, '');
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.user.create({
      data: { username, passwordHash, role: 'PARENT', schoolId, children: { connect: { id: studentId } } },
    });

    return { username, password, reused: false };
  }

  async listStudents(schoolId: string, schoolClassId?: string) {
    return this.prisma.student.findMany({
      where: { schoolId, schoolClassId, deletedAt: null },
      include: { parents: true, schoolClass: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async getStudent(studentId: string, schoolId: string) {
    await this.assertBelongsToSchool(studentId, schoolId);
    return this.prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      include: { parents: true, schoolClass: true },
    });
  }

  async createStudent(dto: CreateStudentDto, schoolId: string) {
    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id: dto.schoolClassId, schoolId },
    });
    if (!schoolClass) {
      throw new NotFoundException("Classe introuvable dans cette école");
    }

    return this.prisma.student.create({
      data: {
        schoolId,
        schoolClassId: dto.schoolClassId,
        lastName: dto.lastName,
        middleName: dto.middleName,
        firstName: dto.firstName,
        sex: dto.sex,
        dateOfBirth: dto.dateOfBirth,
        parents: dto.parent
          ? {
              create: {
                fullName: dto.parent.fullName,
                relationship: dto.parent.relationship,
                phoneNumber: dto.parent.phoneNumber,
                secondaryPhoneNumber: dto.parent.secondaryPhoneNumber,
                address: dto.parent.address,
                notificationChannel: dto.parent.notificationChannel,
              },
            }
          : undefined,
      },
      include: { parents: true, schoolClass: true },
    });
  }

  async updateStudent(studentId: string, dto: UpdateStudentDto, schoolId: string) {
    await this.assertBelongsToSchool(studentId, schoolId);

    if (dto.schoolClassId) {
      const schoolClass = await this.prisma.schoolClass.findFirst({
        where: { id: dto.schoolClassId, schoolId },
      });
      if (!schoolClass) {
        throw new NotFoundException("Classe introuvable dans cette école");
      }
    }

    if (dto.parent) {
      const existingParent = await this.prisma.parentGuardian.findFirst({ where: { studentId } });
      if (existingParent) {
        await this.prisma.parentGuardian.update({ where: { id: existingParent.id }, data: { ...dto.parent } });
      } else {
        await this.prisma.parentGuardian.create({ data: { studentId, ...dto.parent } });
      }
    }

    return this.prisma.student.update({
      where: { id: studentId },
      data: {
        lastName: dto.lastName,
        middleName: dto.middleName,
        firstName: dto.firstName,
        sex: dto.sex,
        dateOfBirth: dto.dateOfBirth,
        schoolClassId: dto.schoolClassId,
      },
      include: { parents: true, schoolClass: true },
    });
  }

  async setPhoto(studentId: string, schoolId: string, photoUrl: string) {
    await this.assertBelongsToSchool(studentId, schoolId);
    return this.prisma.student.update({ where: { id: studentId }, data: { photoUrl } });
  }
}
