import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { generatePassword, generateUniqueUsername } from '@/common/accounts/generate-credentials';
import { PrismaService } from '@/database/prisma.service';
import type { CreateAdminAccountDto } from '@/modules/admin/dto/create-admin-account.dto';

export type ProvisionedAdminAccount = {
  username: string;
  password: string;
};

// Comptes ADMIN : super-utilisateurs transverses à toutes les écoles
// (`schoolId: null`), à l'inverse de StaffService qui scope tout à une école.
// Mêmes garde-fous que StaffService.disable : impossible de désactiver le
// dernier ADMIN actif ni de se désactiver soi-même.
@Injectable()
export class AdminAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAdminAccountDto): Promise<ProvisionedAdminAccount> {
    const username = await generateUniqueUsername(this.prisma, dto.firstName, dto.lastName);
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.user.create({ data: { username, passwordHash, role: 'ADMIN', schoolId: null } });

    return { username, password };
  }

  list() {
    return this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, username: true, disabledAt: true },
      orderBy: { username: 'asc' },
    });
  }

  async disable(userId: string, currentUserId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, role: 'ADMIN' } });
    if (!user) throw new NotFoundException('Compte introuvable');

    if (userId === currentUserId) {
      throw new ForbiddenException('Vous ne pouvez pas désactiver votre propre compte');
    }

    const activeAdminCount = await this.prisma.user.count({ where: { role: 'ADMIN', disabledAt: null } });
    if (activeAdminCount <= 1) {
      throw new ForbiddenException('Impossible de désactiver le dernier compte admin');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { disabledAt: new Date() },
      select: { id: true, username: true, disabledAt: true },
    });
  }
}
