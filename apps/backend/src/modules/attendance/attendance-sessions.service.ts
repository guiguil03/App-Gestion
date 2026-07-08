import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';
import type { AuthenticatedUser } from '@/modules/auth/types';
import type {
  RawAttendanceSessionClose,
  RawAttendanceSessionCreate,
} from '@/modules/sync/dto/push-changes.dto';

@Injectable()
export class AttendanceSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée une session poussée par l'appareil enseignant. `teacherId`/`schoolId`
   * viennent du user authentifié (jamais du payload mobile) pour qu'un
   * appareil ne puisse pas ouvrir une session au nom d'un autre enseignant.
   * Idempotent par id (rejeu de push sans risque).
   */
  async createFromSync(user: AuthenticatedUser, raw: RawAttendanceSessionCreate) {
    if (!user.schoolId) return null; // ADMIN/DIRECTION sans école ne créent pas de session

    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id: raw.school_class_id, schoolId: user.schoolId },
    });
    if (!schoolClass) {
      throw new ForbiddenException("Classe hors du périmètre de l'école");
    }

    return this.prisma.attendanceSession.upsert({
      where: { id: raw.id },
      create: {
        id: raw.id,
        schoolId: user.schoolId,
        schoolClassId: schoolClass.id,
        teacherId: user.userId,
        openedAt: new Date(raw.opened_at),
        expiresAt: new Date(raw.expires_at),
        closedAt: raw.closed_at ? new Date(raw.closed_at) : null,
      },
      update: {},
    });
  }

  /** Fermeture manuelle : seul l'enseignant qui a ouvert la session peut la fermer. */
  async closeFromSync(user: AuthenticatedUser, raw: RawAttendanceSessionClose) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: { id: raw.id, teacherId: user.userId },
    });
    if (!session) {
      throw new NotFoundException('Session introuvable');
    }
    if (session.closedAt) return session; // déjà fermée, no-op

    return this.prisma.attendanceSession.update({
      where: { id: raw.id },
      data: { closedAt: new Date(raw.closed_at) },
    });
  }
}
