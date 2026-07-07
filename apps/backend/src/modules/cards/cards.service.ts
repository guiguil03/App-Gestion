import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';
import { CardSigningService } from '@/modules/cards/card-signing.service';
import { StudentsService } from '@/modules/students/students.service';

@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly signing: CardSigningService,
    private readonly students: StudentsService,
  ) {}

  async issueCard(studentId: string, schoolId: string) {
    await this.students.assertBelongsToSchool(studentId, schoolId);
    const school = await this.prisma.school.findUniqueOrThrow({ where: { id: schoolId } });

    // Perte/vol/renouvellement : toute carte encore active pour cet élève est révoquée.
    await this.prisma.studentCard.updateMany({
      where: { studentId, revoked: false },
      data: { revoked: true },
    });

    const cardId = randomUUID();
    const issuedAt = Date.now();
    const { payloadBase64, signature } = this.signing.sign(
      { cardId, studentId, schoolId, issuedAt },
      school.cardSigningPrivateKey,
    );

    const card = await this.prisma.studentCard.create({
      data: { id: cardId, studentId, signature, issuedAt: new Date(issuedAt), revoked: false },
    });

    return { card, qrCode: this.signing.toQrString(payloadBase64, signature) };
  }

  /** Carte active (non révoquée) d'un élève, avec le QR reconstruit à partir de la signature déjà stockée (pas de re-signature). */
  async getActiveCard(studentId: string, schoolId: string) {
    await this.students.assertBelongsToSchool(studentId, schoolId);

    const card = await this.prisma.studentCard.findFirst({
      where: { studentId, revoked: false },
      orderBy: { issuedAt: 'desc' },
    });
    if (!card) {
      throw new NotFoundException('Aucune carte active pour cet élève');
    }

    const payloadBase64 = Buffer.from(
      JSON.stringify({ cardId: card.id, studentId, schoolId, issuedAt: card.issuedAt.getTime() }),
    ).toString('base64');

    return { card, qrCode: this.signing.toQrString(payloadBase64, card.signature) };
  }

  async revokeCard(cardId: string, schoolId: string) {
    const card = await this.prisma.studentCard.findFirst({
      where: { id: cardId, student: { schoolId } },
    });
    if (!card) throw new NotFoundException('Carte introuvable');

    return this.prisma.studentCard.update({ where: { id: cardId }, data: { revoked: true } });
  }
}
