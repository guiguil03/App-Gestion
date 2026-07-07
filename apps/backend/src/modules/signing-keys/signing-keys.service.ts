import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class SigningKeysService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enregistre (ou remplace) la clé publique Ed25519 générée par l'appareil
   * d'un enseignant/surveillant. Idempotent : rejoué au prochain sync sans
   * effet de bord si la clé n'a pas changé.
   */
  async registerKey(userId: string, publicKey: string) {
    return this.prisma.teacherSigningKey.upsert({
      where: { userId },
      create: { userId, publicKey },
      update: { publicKey },
    });
  }
}
