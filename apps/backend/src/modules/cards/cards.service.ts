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

    return { card, qrCode: this.buildQrCode(card, studentId, schoolId) };
  }

  async revokeCard(cardId: string, schoolId: string) {
    const card = await this.prisma.studentCard.findFirst({
      where: { id: cardId, student: { schoolId } },
    });
    if (!card) throw new NotFoundException('Carte introuvable');

    return this.prisma.studentCard.update({ where: { id: cardId }, data: { revoked: true } });
  }

  /** Statut carte (active + historique révoqué) de tous les élèves de l'école — vue de gestion pour le dashboard. */
  async listForSchool(schoolId: string) {
    const students = await this.prisma.student.findMany({
      where: { schoolId, deletedAt: null },
      include: { schoolClass: true, cards: { orderBy: { issuedAt: 'desc' } } },
      orderBy: [{ schoolClass: { name: 'asc' } }, { lastName: 'asc' }],
    });

    return students.map((student) => {
      const activeCardRow = student.cards.find((c) => !c.revoked) ?? null;
      const history = student.cards.filter((c) => c.id !== activeCardRow?.id);

      return {
        student: {
          id: student.id,
          lastName: student.lastName,
          middleName: student.middleName,
          firstName: student.firstName,
          photoUrl: student.photoUrl,
          schoolClass: {
            id: student.schoolClass.id,
            name: student.schoolClass.name,
            promotion: student.schoolClass.promotion,
          },
        },
        activeCard: activeCardRow
          ? { id: activeCardRow.id, issuedAt: activeCardRow.issuedAt, qrCode: this.buildQrCode(activeCardRow, student.id, schoolId) }
          : null,
        history: history.map((c) => ({ id: c.id, issuedAt: c.issuedAt, revokedAt: c.updatedAt })),
      };
    });
  }

  /** Émet une carte pour chaque élève de la classe qui n'a pas déjà de carte active. */
  async issueBatch(schoolClassId: string, schoolId: string) {
    const students = await this.prisma.student.findMany({
      where: { schoolClassId, schoolId, deletedAt: null },
      include: { cards: { where: { revoked: false } } },
    });
    const toIssue = students.filter((s) => s.cards.length === 0);
    const results = await Promise.all(toIssue.map((s) => this.issueCard(s.id, schoolId)));
    return { issuedCount: results.length };
  }

  private buildQrCode(
    card: { id: string; signature: string; issuedAt: Date },
    studentId: string,
    schoolId: string,
  ): string {
    const payloadBase64 = Buffer.from(
      JSON.stringify({ cardId: card.id, studentId, schoolId, issuedAt: card.issuedAt.getTime() }),
    ).toString('base64');
    return this.signing.toQrString(payloadBase64, card.signature);
  }
}
