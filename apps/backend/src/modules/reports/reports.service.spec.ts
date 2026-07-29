import { ReportsService } from '@/modules/reports/reports.service';

function buildPrisma(overrides: Record<string, any> = {}) {
  return {
    student: { findMany: jest.fn().mockResolvedValue([]) },
    attendanceRecord: { findMany: jest.fn().mockResolvedValue([]) },
    absence: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  } as any;
}

describe('ReportsService.attendanceSummary', () => {
  it('counts one presence per distinct day, even with several checkpoints that day', async () => {
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
      attendanceRecord: {
        findMany: jest.fn().mockResolvedValue([
          { studentId: 's1', recordedAt: new Date('2026-01-05T07:00:00'), isLate: false },
          { studentId: 's1', recordedAt: new Date('2026-01-05T13:00:00'), isLate: false },
          { studentId: 's1', recordedAt: new Date('2026-01-06T07:20:00'), isLate: true },
        ]),
      },
    });
    const service = new ReportsService(prisma);

    const result = await service.attendanceSummary('school-1', undefined, '2026-01-01', '2026-01-31');

    expect(result).toEqual([
      {
        student: {
          id: 's1',
          lastName: 'Doe',
          middleName: null,
          firstName: 'Jane',
          schoolClass: { id: 'c1', name: '6e A', promotion: '2026' },
        },
        presencesCount: 2,
        lateCount: 1,
        absencesJustifiedCount: 0,
        absencesUnjustifiedCount: 0,
      },
    ]);
  });

  it('splits absences into justified/unjustified counts per student', async () => {
    const prisma = buildPrisma({
      student: {
        findMany: jest.fn().mockResolvedValue([
          { id: 's1', lastName: 'Doe', middleName: null, firstName: 'Jane', schoolClass: { id: 'c1', name: '6e A', promotion: '2026' } },
        ]),
      },
      absence: {
        findMany: jest.fn().mockResolvedValue([
          { studentId: 's1', justified: true },
          { studentId: 's1', justified: false },
          { studentId: 's1', justified: false },
        ]),
      },
    });
    const service = new ReportsService(prisma);

    const result = await service.attendanceSummary('school-1', undefined, '2026-01-01', '2026-01-31');

    expect(result[0].absencesJustifiedCount).toBe(1);
    expect(result[0].absencesUnjustifiedCount).toBe(2);
  });
});
