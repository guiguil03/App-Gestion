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
