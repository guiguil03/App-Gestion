import { WeeklyReportJob } from '@/modules/reports/weekly-report.job';

function buildDeps(overrides: Record<string, any> = {}) {
  const prisma = {
    school: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  } as any;
  const reports = { attendanceSummary: jest.fn().mockResolvedValue([]) } as any;
  const email = { send: jest.fn().mockResolvedValue({ status: 'sent' }) } as any;
  const job = new WeeklyReportJob(prisma, reports, email);
  return { job, prisma, reports, email };
}

describe('WeeklyReportJob.handleCron', () => {
  it('sends nothing for a school with no DIRECTION account that opted in', async () => {
    const { job, prisma, email } = buildDeps({
      school: { findMany: jest.fn().mockResolvedValue([{ id: 'school-1', name: 'École Test' }]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    });

    await job.handleCron();

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { schoolId: 'school-1', role: 'DIRECTION', disabledAt: null, email: { not: null } },
      select: { email: true },
    });
    expect(email.send).not.toHaveBeenCalled();
  });

  it('sends the weekly summary to every opted-in DIRECTION account of a school', async () => {
    const { job, reports, email } = buildDeps({
      school: { findMany: jest.fn().mockResolvedValue([{ id: 'school-1', name: 'École Test' }]) },
      user: {
        findMany: jest.fn().mockResolvedValue([{ email: 'direction1@ecole.example' }, { email: 'direction2@ecole.example' }]),
      },
    });
    reports.attendanceSummary.mockResolvedValue([
      {
        student: { lastName: 'Doe', firstName: 'Jane', schoolClass: { name: '6e A' } },
        presencesCount: 4,
        lateCount: 1,
        absencesJustifiedCount: 0,
        absencesUnjustifiedCount: 0,
      },
    ]);

    await job.handleCron();

    expect(email.send).toHaveBeenCalledTimes(2);
    const [to, subject, html] = email.send.mock.calls[0];
    expect(to).toBe('direction1@ecole.example');
    expect(subject).toBe('Rapport hebdomadaire de présence — École Test');
    expect(html).toContain('Jane');
    expect(html).toContain('École Test');
  });

  it('keeps sending to other schools/recipients when one send fails', async () => {
    const { job, email } = buildDeps({
      school: { findMany: jest.fn().mockResolvedValue([{ id: 'school-1', name: 'École Test' }]) },
      user: {
        findMany: jest.fn().mockResolvedValue([{ email: 'direction1@ecole.example' }, { email: 'direction2@ecole.example' }]),
      },
    });
    email.send.mockRejectedValueOnce(new Error('smtp down')).mockResolvedValueOnce({ status: 'sent' });

    await expect(job.handleCron()).resolves.toBeUndefined();

    expect(email.send).toHaveBeenCalledTimes(2);
  });

  it('skips a school entirely when it has no DIRECTION recipients, without calling attendanceSummary', async () => {
    const { job, prisma, reports } = buildDeps({
      school: { findMany: jest.fn().mockResolvedValue([{ id: 'school-1', name: 'École Test' }]) },
    });
    prisma.user.findMany.mockResolvedValue([]);

    await job.handleCron();

    expect(reports.attendanceSummary).not.toHaveBeenCalled();
  });
});
