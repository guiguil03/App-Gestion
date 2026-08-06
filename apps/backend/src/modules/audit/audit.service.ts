import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '@/database/prisma.service';

export type AuditLogEntry = {
  schoolId?: string | null;
  userId?: string | null;
  username?: string | null;
  role?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

export type AuditLogFilters = {
  startDate?: string;
  endDate?: string;
  action?: string;
  limit?: number;
};

// Journalisation des accès et actions sensibles (§4 du cahier des charges).
// Volontairement best-effort : un échec d'écriture du log ne doit jamais
// faire échouer l'action métier elle-même (login, révocation de carte...).
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          schoolId: entry.schoolId ?? null,
          userId: entry.userId ?? null,
          username: entry.username ?? null,
          role: entry.role ?? null,
          action: entry.action,
          targetType: entry.targetType ?? null,
          targetId: entry.targetId ?? null,
          metadata: (entry.metadata as Prisma.InputJsonValue) ?? undefined,
        },
      });
    } catch {
      // best-effort — ne bloque jamais l'action auditée.
    }
  }

  /**
   * Historique des notifications (SMS/push) envoyées pour les enfants d'un
   * compte PARENT — écrit par NotificationsService.notifyParents sous
   * l'action `NOTIFICATION_{SMS|PUSH}_{SENT|FAILED}` avec `targetType:
   * 'Student'`. Même principe de scoping que ReportsService.myChildrenHistory
   * : la liste d'enfants vient uniquement de `ParentGuardian.userId`, jamais
   * d'un id arbitraire fourni par le client.
   */
  async listNotificationsForParent(userId: string, limit?: number) {
    const guardianRows = await this.prisma.parentGuardian.findMany({ where: { userId }, select: { studentId: true } });
    const studentIds = [...new Set(guardianRows.map((row) => row.studentId))];
    if (studentIds.length === 0) return [];

    const [rows, students] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { targetType: 'Student', targetId: { in: studentIds }, action: { startsWith: 'NOTIFICATION_' } },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit ?? 100, 200),
      }),
      this.prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, firstName: true, lastName: true } }),
    ]);
    const studentById = new Map(students.map((student) => [student.id, student]));

    return rows.map((row) => {
      const [, channel, status] = row.action.split('_'); // "NOTIFICATION_SMS_SENT" -> ["NOTIFICATION", "SMS", "SENT"]
      const student = row.targetId ? studentById.get(row.targetId) : undefined;
      return {
        id: row.id,
        createdAt: row.createdAt,
        channel: channel as 'SMS' | 'PUSH',
        status: status as 'SENT' | 'FAILED',
        kind: (row.metadata as { title?: string } | null)?.title ?? null,
        student: student ? { id: student.id, firstName: student.firstName, lastName: student.lastName } : null,
      };
    });
  }

  async list(schoolId: string, filters: AuditLogFilters) {
    const { startDate, endDate, action, limit } = filters;
    return this.prisma.auditLog.findMany({
      where: {
        schoolId,
        action: action ? { contains: action } : undefined,
        createdAt:
          startDate || endDate
            ? {
                gte: startDate ? new Date(`${startDate}T00:00:00`) : undefined,
                lte: endDate ? new Date(`${endDate}T23:59:59.999`) : undefined,
              }
            : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit ?? 200, 500),
    });
  }
}
