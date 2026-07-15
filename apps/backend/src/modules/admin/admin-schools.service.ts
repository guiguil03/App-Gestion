import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { generatePassword, generateUniqueUsername } from '@/common/accounts/generate-credentials';
import { PrismaService } from '@/database/prisma.service';
import { CardSigningService } from '@/modules/cards/card-signing.service';
import type { CreateSchoolDto } from '@/modules/admin/dto/create-school.dto';

function startOfToday(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

@Injectable()
export class AdminSchoolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly signing: CardSigningService,
  ) {}

  async list() {
    const schools = await this.prisma.school.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });

    return Promise.all(
      schools.map(async (school) => {
        const [studentCount, presentToday] = await Promise.all([
          this.prisma.student.count({ where: { schoolId: school.id, deletedAt: null } }),
          this.prisma.attendanceRecord.count({
            where: {
              student: { schoolId: school.id },
              checkpoint: 'PORTAIL',
              direction: 'ENTREE',
              recordedAt: { gte: startOfToday() },
            },
          }),
        ]);

        return {
          id: school.id,
          name: school.name,
          studentCount,
          presentToday,
          rate: studentCount === 0 ? 0 : Math.round((presentToday / studentCount) * 100),
        };
      }),
    );
  }

  /**
   * Onboarding d'un nouvel établissement : crée l'école (avec sa paire de
   * clés Ed25519 de signature de cartes, comme le fait le script de seed) et
   * son premier compte DIRECTION. Le mot de passe n'est retourné qu'ici,
   * comme pour tout provisioning de compte dans l'app (voir StudentsService).
   */
  async create(dto: CreateSchoolDto) {
    const { privateKey, publicKey } = this.signing.generateKeyPair();

    const school = await this.prisma.school.create({
      data: {
        name: dto.name,
        attendanceReferenceTime: '07:30',
        attendanceToleranceMinutes: 15,
        cardSigningPrivateKey: privateKey,
        cardSigningPublicKey: publicKey,
      },
    });

    const username = await generateUniqueUsername(this.prisma, dto.name, 'direction');
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.create({ data: { username, passwordHash, role: 'DIRECTION', schoolId: school.id } });

    return {
      school: { id: school.id, name: school.name },
      directionAccount: { username, password },
    };
  }
}
