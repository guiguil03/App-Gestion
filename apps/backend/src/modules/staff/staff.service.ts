import { Injectable, NotFoundException } from '@nestjs/common';
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

    await this.prisma.user.create({ data: { username, passwordHash, role: dto.role, schoolId } });

    return { username, password };
  }

  list(schoolId: string) {
    return this.prisma.user.findMany({
      where: { schoolId, role: { in: ['ENSEIGNANT', 'SURVEILLANT'] } },
      include: { assignedClasses: true },
      orderBy: { username: 'asc' },
    });
  }

  async disable(userId: string, schoolId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, schoolId } });
    if (!user) throw new NotFoundException('Compte introuvable');
    return this.prisma.user.update({ where: { id: userId }, data: { disabledAt: new Date() } });
  }
}
