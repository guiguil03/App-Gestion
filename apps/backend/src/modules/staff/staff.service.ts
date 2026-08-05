import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { generatePassword, generateUniqueUsername } from '@/common/accounts/generate-credentials';
import { PrismaService } from '@/database/prisma.service';
import type { CreateStaffDto } from '@/modules/staff/dto/create-staff.dto';

export type ProvisionedStaffAccount = {
  username: string;
  password: string;
};

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  // Retourne le mot de passe en clair une seule fois — même contrat que
  // StudentsService.provisionAccount (voir spec §4.3).
  async create(dto: CreateStaffDto, schoolId: string): Promise<ProvisionedStaffAccount> {
    const username = await generateUniqueUsername(this.prisma, dto.firstName, dto.lastName);
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.user.create({
      data: { username, passwordHash, role: dto.role, schoolId, mustChangePassword: true },
    });

    return { username, password };
  }

  list(schoolId: string) {
    return this.prisma.user.findMany({
      where: { schoolId, role: { in: ['ENSEIGNANT', 'SURVEILLANT', 'DIRECTION'] } },
      select: {
        id: true,
        username: true,
        role: true,
        disabledAt: true,
        assignedClasses: { select: { id: true, name: true } },
      },
      orderBy: { username: 'asc' },
    });
  }

  // Même contrat que create()/provisionAccount : le mot de passe en clair
  // n'est retourné qu'une fois, la Direction doit le transmettre immédiatement.
  // L'identifiant existant est conservé, seul le mot de passe change.
  async resetPassword(userId: string, schoolId: string): Promise<ProvisionedStaffAccount> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId, role: { in: ['ENSEIGNANT', 'SURVEILLANT', 'DIRECTION'] } },
    });
    if (!user) throw new NotFoundException('Compte introuvable');

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: true } });

    return { username: user.username, password };
  }

  async disable(userId: string, schoolId: string, currentUserId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, schoolId } });
    if (!user) throw new NotFoundException('Compte introuvable');

    if (userId === currentUserId) {
      throw new ForbiddenException('Vous ne pouvez pas désactiver votre propre compte');
    }

    if (user.role === 'DIRECTION') {
      const activeDirectionCount = await this.prisma.user.count({
        where: { schoolId, role: 'DIRECTION', disabledAt: null },
      });
      if (activeDirectionCount <= 1) {
        throw new ForbiddenException("Impossible de désactiver le dernier compte direction de l'école");
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { disabledAt: new Date() },
      select: { id: true, username: true, role: true, disabledAt: true },
    });
  }
}
