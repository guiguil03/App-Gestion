import { randomInt } from 'node:crypto';

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '@/database/prisma.service';

// Sans caractères ambigus à la lecture/saisie (0/O, 1/l/I).
const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function generatePassword(length = 8): string {
  let password = '';
  for (let i = 0; i < length; i++) {
    password += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return password;
}

export type ProvisionedAccount = {
  username: string;
  password: string;
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
    const username = existing?.username ?? (await this.generateUniqueUsername(student.firstName, student.lastName));
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.user.upsert({
      where: { studentId },
      create: { username, passwordHash, role: 'ELEVE', schoolId, studentId },
      update: { passwordHash },
    });

    return { username, password };
  }

  private async generateUniqueUsername(firstName: string, lastName: string): Promise<string> {
    const base = `${normalize(firstName)}.${normalize(lastName)}`;
    let candidate = base;
    let suffix = 1;
    while (await this.prisma.user.findUnique({ where: { username: candidate } })) {
      suffix++;
      candidate = `${base}${suffix}`;
    }
    return candidate;
  }
}
