import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';

const RESULTS_PER_CATEGORY = 5;
const MIN_QUERY_LENGTH = 2;

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recherche transverse (élèves/classes/personnel) pour la barre de
   * recherche globale du dashboard — un seul champ plutôt qu'un champ par
   * page. Sous 2 caractères : aucune requête (évite de scanner toute la
   * table sur une lettre isolée pendant la frappe).
   */
  async search(schoolId: string, query: string) {
    const term = query.trim();
    if (term.length < MIN_QUERY_LENGTH) {
      return { students: [], classes: [], staff: [] };
    }

    const [students, classes, staff] = await Promise.all([
      this.prisma.student.findMany({
        where: {
          schoolId,
          deletedAt: null,
          OR: [
            { firstName: { contains: term, mode: 'insensitive' } },
            { lastName: { contains: term, mode: 'insensitive' } },
            { middleName: { contains: term, mode: 'insensitive' } },
          ],
        },
        include: { schoolClass: true },
        orderBy: { lastName: 'asc' },
        take: RESULTS_PER_CATEGORY,
      }),
      this.prisma.schoolClass.findMany({
        where: { schoolId, deletedAt: null, name: { contains: term, mode: 'insensitive' } },
        orderBy: { name: 'asc' },
        take: RESULTS_PER_CATEGORY,
      }),
      this.prisma.user.findMany({
        where: {
          schoolId,
          role: { in: ['ENSEIGNANT', 'SURVEILLANT', 'DIRECTION'] },
          username: { contains: term, mode: 'insensitive' },
        },
        select: { id: true, username: true, role: true, disabledAt: true },
        orderBy: { username: 'asc' },
        take: RESULTS_PER_CATEGORY,
      }),
    ]);

    return {
      students: students.map((s) => ({
        id: s.id,
        fullName: [s.lastName, s.middleName, s.firstName].filter(Boolean).join(' '),
        schoolClassName: s.schoolClass.name,
      })),
      classes: classes.map((c) => ({ id: c.id, name: c.name, promotion: c.promotion })),
      staff: staff.map((u) => ({ id: u.id, username: u.username, role: u.role, disabled: !!u.disabledAt })),
    };
  }
}
