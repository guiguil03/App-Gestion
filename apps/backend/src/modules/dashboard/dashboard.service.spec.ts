import { DashboardService } from '@/modules/dashboard/dashboard.service';

function buildPrisma(overrides: Record<string, any> = {}) {
  return {
    student: { count: jest.fn().mockResolvedValue(0) },
    attendanceRecord: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
    absence: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    schoolClass: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  } as any;
}

describe('DashboardService.getOverview', () => {
  it('computes present/late/absent counts and a rounded rate', async () => {
    const prisma = buildPrisma({
      student: { count: jest.fn().mockResolvedValue(20) },
      attendanceRecord: {
        findMany: jest.fn().mockResolvedValue([
          { studentId: 's1', isLate: false },
          { studentId: 's2', isLate: true },
        ]),
      },
      absence: { count: jest.fn().mockResolvedValue(3) },
    });
    const service = new DashboardService(prisma);

    const overview = await service.getOverview('school-1');

    expect(overview).toEqual({ totalStudents: 20, presentCount: 2, lateCount: 1, absentCount: 3, rate: 10 });
  });

  it('returns a 0 rate when the school has no students (avoids division by zero)', async () => {
    const prisma = buildPrisma();
    const service = new DashboardService(prisma);

    const overview = await service.getOverview('school-1');

    expect(overview.rate).toBe(0);
  });
});

describe('DashboardService.getAlerts', () => {
  it('lists unjustified absences and students with repeated lateness (default threshold 3)', async () => {
    const prisma = buildPrisma({
      absence: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'absence-1', date: '2026-07-14', student: { id: 's1', firstName: 'Grace', lastName: 'Nkumu' } },
        ]),
      },
      attendanceRecord: {
        groupBy: jest.fn().mockResolvedValue([{ studentId: 's2', _count: { studentId: 4 } }]),
        findMany: jest.fn(),
      },
      student: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([{ id: 's2', firstName: 'Paul', lastName: 'Mbeki' }]) },
    });
    const service = new DashboardService(prisma);

    const alerts = await service.getAlerts('school-1');

    expect(alerts.unjustifiedAbsences).toHaveLength(1);
    expect(alerts.repeatedLateness).toEqual([{ studentId: 's2', firstName: 'Paul', lastName: 'Mbeki', lateCount: 4 }]);
  });
});

import { AbsenceMarkedEvent } from '@/modules/absences/events/absence-marked.event';
import { AttendanceRecordedEvent } from '@/modules/attendance/events/attendance-recorded.event';
import type { MessageEvent } from '@nestjs/common';

describe('DashboardService realtime stream', () => {
  it('emits attendance and absence events only to subscribers of the matching school', () => {
    const service = new DashboardService(buildPrisma());
    const receivedForSchool1: MessageEvent[] = [];
    const receivedForSchool2: MessageEvent[] = [];
    service.streamFor('school-1').subscribe((event) => receivedForSchool1.push(event));
    service.streamFor('school-2').subscribe((event) => receivedForSchool2.push(event));

    service.onAttendanceRecorded(new AttendanceRecordedEvent('rec-1', 'student-1', 'school-1', false, new Date()));
    service.onAbsenceMarked(new AbsenceMarkedEvent('absence-1', 'student-2', 'school-1', '2026-07-14'));

    expect(receivedForSchool1).toHaveLength(2);
    expect(receivedForSchool1[0].type).toBe('attendance.recorded');
    expect(receivedForSchool1[1].type).toBe('absence.marked');
    expect(receivedForSchool2).toHaveLength(0);
  });
});
