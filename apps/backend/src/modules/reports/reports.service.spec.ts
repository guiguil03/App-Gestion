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

describe('ReportsService.attendanceHistory', () => {
  const student = { id: 's1', lastName: 'Doe', middleName: null, firstName: 'Jane', schoolClass: { id: 'c1', name: '6e A', promotion: '2026' } };

  it('keeps only the first checkpoint of the day and derives PRESENT/LATE from isLate', async () => {
    const day5Entry = new Date('2026-01-05T07:00:00');
    const day6Entry = new Date('2026-01-06T07:20:00');
    const prisma = buildPrisma({
      attendanceRecord: {
        findMany: jest.fn().mockResolvedValue([
          { studentId: 's1', recordedAt: day5Entry, isLate: false, student },
          { studentId: 's1', recordedAt: new Date('2026-01-05T13:00:00'), isLate: false, student },
          { studentId: 's1', recordedAt: day6Entry, isLate: true, student },
        ]),
      },
    });
    const service = new ReportsService(prisma);

    const result = await service.attendanceHistory('school-1', { startDate: '2026-01-01', endDate: '2026-01-31' });

    expect(result).toEqual([
      { student, date: '2026-01-06', status: 'LATE', justified: null, justificationReason: null, recordedAt: day6Entry.toISOString() },
      { student, date: '2026-01-05', status: 'PRESENT', justified: null, justificationReason: null, recordedAt: day5Entry.toISOString() },
    ]);
  });

  it('reports absences with their justification and filters by status', async () => {
    const prisma = buildPrisma({
      absence: {
        findMany: jest.fn().mockResolvedValue([
          { studentId: 's1', date: '2026-01-07', justified: true, justificationReason: 'Maladie', student },
        ]),
      },
    });
    const service = new ReportsService(prisma);

    const all = await service.attendanceHistory('school-1', { startDate: '2026-01-01', endDate: '2026-01-31' });
    expect(all).toEqual([
      { student, date: '2026-01-07', status: 'ABSENT', justified: true, justificationReason: 'Maladie', recordedAt: null },
    ]);

    const filteredOut = await service.attendanceHistory('school-1', {
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      status: 'present',
    });
    expect(filteredOut).toEqual([]);
  });
});
