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
