import { SearchService } from '@/modules/search/search.service';

function buildPrisma(overrides: Record<string, any> = {}) {
  return {
    student: { findMany: jest.fn().mockResolvedValue([]) },
    schoolClass: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  } as any;
}

describe('SearchService.search', () => {
  it('returns empty results without querying anything for a query under 2 characters', async () => {
    const prisma = buildPrisma();
    const service = new SearchService(prisma);

    const result = await service.search('school-1', 'a');

    expect(result).toEqual({ students: [], classes: [], staff: [] });
    expect(prisma.student.findMany).not.toHaveBeenCalled();
    expect(prisma.schoolClass.findMany).not.toHaveBeenCalled();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('ignores surrounding whitespace when checking the minimum length', async () => {
    const prisma = buildPrisma();
    const service = new SearchService(prisma);

    await service.search('school-1', '  a  ');

    expect(prisma.student.findMany).not.toHaveBeenCalled();
  });

  it('searches students by first/last/middle name, scoped to the school, capped at 5', async () => {
    const prisma = buildPrisma({
      student: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 's1',
            lastName: 'Doe',
            middleName: null,
            firstName: 'Jane',
            schoolClass: { id: 'c1', name: '6e A', promotion: '2026' },
          },
        ]),
      },
    });
    const service = new SearchService(prisma);

    const result = await service.search('school-1', 'doe');

    expect(prisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: 'school-1',
          deletedAt: null,
          OR: [
            { firstName: { contains: 'doe', mode: 'insensitive' } },
            { lastName: { contains: 'doe', mode: 'insensitive' } },
            { middleName: { contains: 'doe', mode: 'insensitive' } },
          ],
        }),
        take: 5,
      }),
    );
    expect(result.students).toEqual([{ id: 's1', fullName: 'Doe Jane', schoolClassName: '6e A' }]);
  });

  it('searches classes by name, scoped to the school', async () => {
    const prisma = buildPrisma({
      schoolClass: { findMany: jest.fn().mockResolvedValue([{ id: 'c1', name: '6e A', promotion: '2026' }]) },
    });
    const service = new SearchService(prisma);

    const result = await service.search('school-1', '6e');

    expect(prisma.schoolClass.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId: 'school-1', deletedAt: null, name: { contains: '6e', mode: 'insensitive' } },
      }),
    );
    expect(result.classes).toEqual([{ id: 'c1', name: '6e A', promotion: '2026' }]);
  });

  it('searches staff by username, restricted to ENSEIGNANT/SURVEILLANT/DIRECTION roles', async () => {
    const prisma = buildPrisma({
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 'u1', username: 'jdoe', role: 'ENSEIGNANT', disabledAt: null }]),
      },
    });
    const service = new SearchService(prisma);

    const result = await service.search('school-1', 'jdoe');

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          schoolId: 'school-1',
          role: { in: ['ENSEIGNANT', 'SURVEILLANT', 'DIRECTION'] },
          username: { contains: 'jdoe', mode: 'insensitive' },
        },
      }),
    );
    expect(result.staff).toEqual([{ id: 'u1', username: 'jdoe', role: 'ENSEIGNANT', disabled: false }]);
  });
});
