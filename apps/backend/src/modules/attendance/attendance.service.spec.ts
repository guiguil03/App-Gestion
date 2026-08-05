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
    attendanceRecord: {
      upsert: jest.fn().mockResolvedValue({ id: 'record-1' }),
      create: jest.fn().mockResolvedValue({ id: 'record-manual-1' }),
    },
    absence: { deleteMany: jest.fn() },
  } as any;
  const students = { assertBelongsToSchool: jest.fn().mockResolvedValue({ id: 'student-1', schoolClassId: 'class-1' }) } as any;
  const events = { emit: jest.fn() } as any;
  const audit = { log: jest.fn() } as any;
  const service = new AttendanceService(prisma, students, new LateDetectionService(), events, audit);
  return { service, prisma, students, events, audit };
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

  // Un élève pointé "Salle de classe" (carte oubliée, pointage manuel de
  // l'enseignant) est tout autant présent qu'un pointage Portail : ne pas
  // annuler son absence sur ce seul motif de checkpoint/direction enverrait
  // à tort un SMS "absent" à son parent malgré un vrai pointage du jour.
  it('deletes any existing Absence regardless of checkpoint/direction (ex. pointage Salle de classe)', async () => {
    const { service, prisma } = buildDeps();

    await service.recordFromSync(
      { schoolId: 'school-1' } as any,
      {
        id: 'raw-2',
        student_id: 'student-1',
        checkpoint: 'classe',
        direction: 'sortie',
        recorded_at: '2026-07-14T16:00:00',
        session_id: undefined,
      } as any,
    );

    expect(prisma.absence.deleteMany).toHaveBeenCalledWith({ where: { studentId: 'student-1', date: '2026-07-14' } });
  });
});

describe('AttendanceService.recordFromSync — scan window', () => {
  function buildDepsWithSchool(schoolOverrides: Record<string, unknown>) {
    const deps = buildDeps();
    deps.prisma.school.findUniqueOrThrow = jest.fn().mockResolvedValue({
      id: 'school-1',
      attendanceReferenceTime: '07:30',
      attendanceToleranceMinutes: 15,
      scanWindowStart: null,
      scanWindowEnd: null,
      ...schoolOverrides,
    });
    return deps;
  }

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

    expect(result).toEqual({ rejected: true, id: 'raw-6', reason: 'scan_window' });
    expect(prisma.attendanceRecord.upsert).not.toHaveBeenCalled();
  });

  it('does not restrict scans when no scan window is configured', async () => {
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

describe('AttendanceService.recordFromSync — pointage manuel (élève sans carte)', () => {
  it('persists isManual and writes an audit log entry when the device reports a manual pointage', async () => {
    const { service, prisma, audit } = buildDeps();

    await service.recordFromSync(
      { schoolId: 'school-1', userId: 'user-1', username: 'prof1', role: 'ENSEIGNANT' } as any,
      {
        id: 'raw-manual-1',
        student_id: 'student-1',
        checkpoint: 'portail',
        direction: 'entree',
        recorded_at: '2026-07-14T08:00:00',
        is_manual: true,
        session_id: undefined,
      } as any,
    );

    expect(prisma.attendanceRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ isManual: true }) }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'attendance.manual_record',
        userId: 'user-1',
        targetId: 'student-1',
        metadata: expect.objectContaining({ source: 'mobile' }),
      }),
    );
  });

  it('does not write an audit log entry for a regular card scan', async () => {
    const { service, audit } = buildDeps();

    await service.recordFromSync(
      { schoolId: 'school-1', userId: 'user-1', username: 'prof1', role: 'ENSEIGNANT' } as any,
      {
        id: 'raw-card-1',
        student_id: 'student-1',
        checkpoint: 'portail',
        direction: 'entree',
        recorded_at: '2026-07-14T08:00:00',
        session_id: undefined,
      } as any,
    );

    expect(audit.log).not.toHaveBeenCalled();
  });
});

describe('AttendanceService.recordManual', () => {
  it('creates a PORTAIL/ENTREE record with no geofence or scan-window check, and clears any stale absence for that day', async () => {
    const { service, prisma, students } = buildDeps();

    const result = await service.recordManual('student-1', 'school-1', { date: '2026-07-14', time: '08:15', isLate: true });

    expect(students.assertBelongsToSchool).toHaveBeenCalledWith('student-1', 'school-1');
    expect(prisma.attendanceRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: 'student-1',
          checkpoint: 'PORTAIL',
          direction: 'ENTREE',
          isLate: true,
          recordedAt: new Date('2026-07-14T08:15:00'),
        }),
      }),
    );
    expect(prisma.absence.deleteMany).toHaveBeenCalledWith({ where: { studentId: 'student-1', date: '2026-07-14' } });
    expect(result).toEqual({ id: 'record-manual-1' });
  });

  it('emits ATTENDANCE_RECORDED_EVENT like a real scan, so the parent notification pipeline fires', async () => {
    const { service, events } = buildDeps();

    await service.recordManual('student-1', 'school-1', { date: '2026-07-14', time: '08:15', isLate: false });

    expect(events.emit).toHaveBeenCalledWith(
      'attendance.recorded',
      expect.objectContaining({ studentId: 'student-1', schoolId: 'school-1', isLate: false }),
    );
  });
});
