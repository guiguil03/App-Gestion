import { NotificationsService } from '@/modules/notifications/notifications.service';
import { AbsenceMarkedEvent } from '@/modules/absences/events/absence-marked.event';

function buildDeps() {
  const prisma = {
    student: { findUnique: jest.fn() },
    parentGuardian: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
  } as any;
  const sms = { send: jest.fn().mockResolvedValue({ status: 'sent-mock' }) } as any;
  const push = { send: jest.fn().mockResolvedValue({ status: 'sent-mock' }) } as any;
  const service = new NotificationsService(prisma, sms, push);
  return { service, prisma, sms, push };
}

describe('NotificationsService.handleAbsenceMarked', () => {
  it('sends SMS to parents with SMS/BOTH channel and push to linked PARENT accounts with a token', async () => {
    const { service, prisma, sms, push } = buildDeps();
    prisma.student.findUnique.mockResolvedValue({
      id: 'student-1',
      lastName: 'Nkumu',
      middleName: null,
      firstName: 'Grace',
      school: { name: 'École Test' },
    });
    prisma.parentGuardian.findMany.mockResolvedValue([
      { id: 'pg-1', phoneNumber: '+243900000001', notificationChannel: 'SMS' },
      { id: 'pg-2', phoneNumber: '+243900000002', notificationChannel: 'PUSH' },
    ]);
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1', expoPushToken: 'ExponentPushToken[abc]' }]);

    await service.handleAbsenceMarked(new AbsenceMarkedEvent('absence-1', 'student-1', 'school-1', '2026-07-14'));

    expect(sms.send).toHaveBeenCalledWith('+243900000001', expect.stringContaining('Nkumu Grace'));
    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(push.send).toHaveBeenCalledWith('ExponentPushToken[abc]', 'Absence', expect.stringContaining('Nkumu Grace'));
  });

  it('does nothing if the student cannot be found', async () => {
    const { service, prisma, sms, push } = buildDeps();
    prisma.student.findUnique.mockResolvedValue(null);

    await service.handleAbsenceMarked(new AbsenceMarkedEvent('absence-1', 'student-1', 'school-1', '2026-07-14'));

    expect(sms.send).not.toHaveBeenCalled();
    expect(push.send).not.toHaveBeenCalled();
  });
});

describe('NotificationsService.handleAttendanceRecorded — push', () => {
  it('also sends push to linked PARENT accounts with a token, in addition to existing SMS behaviour', async () => {
    const { service, prisma, sms, push } = buildDeps();
    prisma.student.findUnique.mockResolvedValue({
      id: 'student-1',
      lastName: 'Nkumu',
      middleName: null,
      firstName: 'Grace',
      school: { name: 'École Test' },
    });
    prisma.parentGuardian.findMany.mockResolvedValue([
      { id: 'pg-1', phoneNumber: '+243900000001', notificationChannel: 'BOTH' },
    ]);
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1', expoPushToken: 'ExponentPushToken[abc]' }]);

    await service.handleAttendanceRecorded({
      studentId: 'student-1',
      recordedAt: new Date('2026-07-14T07:31:00'),
      isLate: true,
    } as any);

    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(push.send).toHaveBeenCalledWith('ExponentPushToken[abc]', 'Arrivée', expect.stringContaining('Nkumu Grace'));
  });
});
