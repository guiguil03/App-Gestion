import { AttendanceService } from '@/modules/attendance/attendance.service';
import { LateDetectionService } from '@/modules/attendance/late-detection.service';

function buildDeps() {
  const prisma = {
    attendanceSession: { findFirst: jest.fn() },
    school: { findUniqueOrThrow: jest.fn().mockResolvedValue({
      id: 'school-1',
      attendanceReferenceTime: '07:30',
      attendanceToleranceMinutes: 15,
    }) },
    attendanceRecord: { upsert: jest.fn().mockResolvedValue({ id: 'record-1' }) },
    absence: { deleteMany: jest.fn() },
  } as any;
  const students = { assertBelongsToSchool: jest.fn().mockResolvedValue({ id: 'student-1', schoolClassId: 'class-1' }) } as any;
  const events = { emit: jest.fn() } as any;
  const service = new AttendanceService(prisma, students, new LateDetectionService(), events);
  return { service, prisma, students };
}

describe('AttendanceService.recordFromSync — stale absence cleanup', () => {
  it('deletes any existing Absence for the student on a late PORTAIL/ENTREE check-in', async () => {
    const { service, prisma } = buildDeps();

    await service.recordFromSync(
      { schoolId: 'school-1' } as any,
      {
        id: 'raw-1',
        student_id: 'student-1',
        checkpoint: 'portail',
        direction: 'entree',
        recorded_at: '2026-07-14T08:00:00',
        session_id: undefined,
      } as any,
    );

    expect(prisma.absence.deleteMany).toHaveBeenCalledWith({ where: { studentId: 'student-1', date: '2026-07-14' } });
  });

  it('does not touch absences for a SORTIE record', async () => {
    const { service, prisma } = buildDeps();

    await service.recordFromSync(
      { schoolId: 'school-1' } as any,
      {
        id: 'raw-2',
        student_id: 'student-1',
        checkpoint: 'portail',
        direction: 'sortie',
        recorded_at: '2026-07-14T16:00:00',
        session_id: undefined,
      } as any,
    );

    expect(prisma.absence.deleteMany).not.toHaveBeenCalled();
  });
});

describe('AttendanceService.recordFromSync — geofence and scan window', () => {
  function buildDepsWithSchool(schoolOverrides: Record<string, unknown>) {
    const deps = buildDeps();
    deps.prisma.school.findUniqueOrThrow = jest.fn().mockResolvedValue({
      id: 'school-1',
      attendanceReferenceTime: '07:30',
      attendanceToleranceMinutes: 15,
      geofenceCorners: null,
      scanWindowStart: null,
      scanWindowEnd: null,
      ...schoolOverrides,
    });
    return deps;
  }

  const SQUARE = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 10 },
    { lat: 10, lng: 10 },
    { lat: 10, lng: 0 },
  ];

  it('rejects a scan outside the configured geofence (record not created)', async () => {
    const { service, prisma } = buildDepsWithSchool({ geofenceCorners: SQUARE });

    const result = await service.recordFromSync(
      { schoolId: 'school-1' } as any,
      {
        id: 'raw-3',
        student_id: 'student-1',
        checkpoint: 'portail',
        direction: 'entree',
        recorded_at: '2026-07-14T08:00:00',
        session_id: undefined,
        latitude: 50,
        longitude: 50,
      } as any,
    );

    expect(result).toBeNull();
    expect(prisma.attendanceRecord.upsert).not.toHaveBeenCalled();
  });

  it('rejects a scan with no coordinates when a geofence is configured', async () => {
    const { service, prisma } = buildDepsWithSchool({ geofenceCorners: SQUARE });

    const result = await service.recordFromSync(
      { schoolId: 'school-1' } as any,
      {
        id: 'raw-4',
        student_id: 'student-1',
        checkpoint: 'portail',
        direction: 'entree',
        recorded_at: '2026-07-14T08:00:00',
        session_id: undefined,
      } as any,
    );

    expect(result).toBeNull();
    expect(prisma.attendanceRecord.upsert).not.toHaveBeenCalled();
  });

  it('accepts a scan inside the configured geofence', async () => {
    const { service, prisma } = buildDepsWithSchool({ geofenceCorners: SQUARE });

    await service.recordFromSync(
      { schoolId: 'school-1' } as any,
      {
        id: 'raw-5',
        student_id: 'student-1',
        checkpoint: 'portail',
        direction: 'entree',
        recorded_at: '2026-07-14T08:00:00',
        session_id: undefined,
        latitude: 5,
        longitude: 5,
      } as any,
    );

    expect(prisma.attendanceRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ latitude: 5, longitude: 5 }) }),
    );
  });

  it('rejects a scan outside the configured scan window', async () => {
    const { service, prisma } = buildDepsWithSchool({ scanWindowStart: '06:00', scanWindowEnd: '07:00' });

    const result = await service.recordFromSync(
      { schoolId: 'school-1' } as any,
      {
        id: 'raw-6',
        student_id: 'student-1',
        checkpoint: 'portail',
        direction: 'entree',
        recorded_at: '2026-07-14T08:00:00',
        session_id: undefined,
      } as any,
    );

    expect(result).toBeNull();
    expect(prisma.attendanceRecord.upsert).not.toHaveBeenCalled();
  });

  it('does not restrict scans when no geofence or scan window is configured', async () => {
    const { service, prisma } = buildDepsWithSchool({});

    await service.recordFromSync(
      { schoolId: 'school-1' } as any,
      {
        id: 'raw-7',
        student_id: 'student-1',
        checkpoint: 'portail',
        direction: 'entree',
        recorded_at: '2026-07-14T08:00:00',
        session_id: undefined,
      } as any,
    );

    expect(prisma.attendanceRecord.upsert).toHaveBeenCalled();
  });
});
