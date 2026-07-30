import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { ParentGuardian } from '@prisma/client';

import { generatePassword, generateUniqueUsername } from '@/common/accounts/generate-credentials';
import { FieldEncryptionService } from '@/common/crypto/field-encryption';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: FieldEncryptionService,
  ) {}

  /** phoneNumber/secondaryPhoneNumber/address sont chiffrés en base (voir FieldEncryptionService) — déchiffrés juste avant de quitter le service. */
  private decryptParent(parent: ParentGuardian): ParentGuardian {
    return {
      ...parent,
      phoneNumber: this.crypto.decrypt(parent.phoneNumber),
      secondaryPhoneNumber: this.crypto.decrypt(parent.secondaryPhoneNumber),
      address: this.crypto.decrypt(parent.address),
    };
  }

  private decryptStudent<T extends { parents: ParentGuardian[] }>(student: T): T {
    return { ...student, parents: student.parents.map((p) => this.decryptParent(p)) };
  }

  /**
   * Chiffre les champs sensibles avant écriture + calcule le hash de
   * recherche exacte (voir ParentGuardian.phoneNumberHash). Générique pour
   * préserver les autres champs de `parent` (fullName, relationship,
   * notificationChannel...) dans le type de retour, quel que soit l'appelant.
   */
  private encryptParentInput<T extends { phoneNumber: string; secondaryPhoneNumber?: string; address?: string }>(parent: T) {
    return {
      ...parent,
      phoneNumber: this.crypto.encrypt(parent.phoneNumber),
      phoneNumberHash: this.crypto.hashForLookup(parent.phoneNumber),
      secondaryPhoneNumber: this.crypto.encrypt(parent.secondaryPhoneNumber),
      address: this.crypto.encrypt(parent.address),
    };
  }

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

    // `phoneNumber` est chiffré (IV aléatoire) : la comparaison d'égalité se
    // fait sur `phoneNumberHash` (HMAC déterministe), jamais sur le
    // ciphertext. Une fiche pas encore migrée (hash absent, cf. script de
    // backfill) ne peut matcher aucune fiche existante — on crée alors un
    // nouveau compte plutôt que de risquer un faux positif sur `null`.
    const existingAccount = parentGuardian.phoneNumberHash
      ? await this.prisma.user.findFirst({
          where: {
            role: 'PARENT',
            schoolId,
            children: { some: { parents: { some: { phoneNumberHash: parentGuardian.phoneNumberHash } } } },
          },
        })
      : null;

    if (existingAccount) {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: existingAccount.id },
          data: { children: { connect: { id: studentId } } },
        }),
        this.prisma.parentGuardian.update({
          where: { id: parentGuardianId },
          data: { userId: existingAccount.id },
        }),
      ]);
      return { username: existingAccount.username, password: null, reused: true };
    }

    const username = await generateUniqueUsername(this.prisma, parentGuardian.fullName, '');
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    const account = await this.prisma.user.create({
      data: { username, passwordHash, role: 'PARENT', schoolId, children: { connect: { id: studentId } } },
    });
    await this.prisma.parentGuardian.update({
      where: { id: parentGuardianId },
      data: { userId: account.id },
    });

    return { username, password, reused: false };
  }

  async listStudents(schoolId: string, schoolClassId?: string) {
    const students = await this.prisma.student.findMany({
      where: { schoolId, schoolClassId, deletedAt: null },
      include: { parents: true, schoolClass: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    return students.map((s) => this.decryptStudent(s));
  }

  /**
   * Variante paginée + recherche serveur de listStudents — utilisée par la
   * page Élèves du dashboard une fois le nombre d'élèves trop grand pour
   * charger la liste complète à chaque frappe. `listStudents` reste
   * inchangée (utilisée par l'app mobile et le filtre par élève de
   * Rapports/Historique, qui ont besoin du roster complet).
   */
  async listStudentsPaginated(
    schoolId: string,
    opts: { schoolClassId?: string; search?: string; page: number; pageSize: number },
  ) {
    const term = opts.search?.trim();
    const where = {
      schoolId,
      schoolClassId: opts.schoolClassId,
      deletedAt: null,
      ...(term
        ? {
            OR: [
              { lastName: { contains: term, mode: 'insensitive' as const } },
              { firstName: { contains: term, mode: 'insensitive' as const } },
              { middleName: { contains: term, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: { parents: true, schoolClass: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (opts.page - 1) * opts.pageSize,
        take: opts.pageSize,
      }),
      this.prisma.student.count({ where }),
    ]);

    return { items: items.map((s) => this.decryptStudent(s)), total, page: opts.page, pageSize: opts.pageSize };
  }

  async getStudent(studentId: string, schoolId: string) {
    await this.assertBelongsToSchool(studentId, schoolId);
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      include: { parents: true, schoolClass: true },
    });
    return this.decryptStudent(student);
  }

  async createStudent(dto: CreateStudentDto, schoolId: string) {
    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id: dto.schoolClassId, schoolId },
    });
    if (!schoolClass) {
      throw new NotFoundException("Classe introuvable dans cette école");
    }

    const student = await this.prisma.student.create({
      data: {
        schoolId,
        schoolClassId: dto.schoolClassId,
        lastName: dto.lastName,
        middleName: dto.middleName,
        firstName: dto.firstName,
        sex: dto.sex,
        dateOfBirth: dto.dateOfBirth,
        parents: dto.parent ? { create: this.encryptParentInput(dto.parent) } : undefined,
      },
      include: { parents: true, schoolClass: true },
    });
    return this.decryptStudent(student);
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
      const encrypted = this.encryptParentInput(dto.parent);
      if (existingParent) {
        await this.prisma.parentGuardian.update({ where: { id: existingParent.id }, data: encrypted });
      } else {
        await this.prisma.parentGuardian.create({ data: { studentId, ...encrypted } });
      }
    }

    const student = await this.prisma.student.update({
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
    return this.decryptStudent(student);
  }

  async setPhoto(studentId: string, schoolId: string, photoUrl: string) {
    await this.assertBelongsToSchool(studentId, schoolId);
    return this.prisma.student.update({ where: { id: studentId }, data: { photoUrl } });
  }
}
