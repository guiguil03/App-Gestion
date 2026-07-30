import { FieldEncryptionService } from '@/common/crypto/field-encryption';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { AbsenceMarkedEvent } from '@/modules/absences/events/absence-marked.event';

const TEST_KEY = 'rUR8diTv1ibh3EQjrTlczr1DWUV5aAVduQeB+339dkg=';

function buildDeps() {
  process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
  const crypto = new FieldEncryptionService();
  const prisma = {
    student: { findUnique: jest.fn() },
    parentGuardian: { findMany: jest.fn() },
  } as any;
  const sms = { send: jest.fn().mockResolvedValue({ status: 'sent-mock' }) } as any;
  const push = { send: jest.fn().mockResolvedValue({ status: 'sent-mock' }) } as any;
  const service = new NotificationsService(prisma, sms, push, crypto);
  return { service, prisma, sms, push, crypto };
}

describe('NotificationsService.handleAbsenceMarked', () => {
  it('sends SMS to parents with SMS/BOTH channel and push to the account linked to a PUSH/BOTH fiche with a token', async () => {
    const { service, prisma, sms, push, crypto } = buildDeps();
    prisma.student.findUnique.mockResolvedValue({
      id: 'student-1',
      lastName: 'Nkumu',
      middleName: null,
      firstName: 'Grace',
      school: { name: 'École Test' },
    });
    prisma.parentGuardian.findMany.mockResolvedValue([
      { id: 'pg-1', phoneNumber: crypto.encrypt('+243900000001'), notificationChannel: 'SMS', user: null },
      {
        id: 'pg-2',
        phoneNumber: crypto.encrypt('+243900000002'),
        notificationChannel: 'PUSH',
        user: { id: 'user-1', expoPushToken: 'ExponentPushToken[abc]' },
      },
    ]);

    await service.handleAbsenceMarked(new AbsenceMarkedEvent('absence-1', 'student-1', 'school-1', '2026-07-14'));

    expect(sms.send).toHaveBeenCalledWith('+243900000001', expect.stringContaining('Nkumu Grace'));
    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(push.send).toHaveBeenCalledWith('ExponentPushToken[abc]', 'Absence', expect.stringContaining('Nkumu Grace'));
  });

  it('does not push to a fiche whose channel is SMS-only, even if its linked account has a token', async () => {
    const { service, prisma, sms, push, crypto } = buildDeps();
    prisma.student.findUnique.mockResolvedValue({
      id: 'student-1',
      lastName: 'Nkumu',
      middleName: null,
      firstName: 'Grace',
      school: { name: 'École Test' },
    });
    prisma.parentGuardian.findMany.mockResolvedValue([
      {
        id: 'pg-1',
        phoneNumber: crypto.encrypt('+243900000001'),
        notificationChannel: 'SMS',
        user: { id: 'user-1', expoPushToken: 'ExponentPushToken[abc]' },
      },
    ]);

    await service.handleAbsenceMarked(new AbsenceMarkedEvent('absence-1', 'student-1', 'school-1', '2026-07-14'));

    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(push.send).not.toHaveBeenCalled();
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
  it('also sends push to the linked account of a BOTH fiche with a token, in addition to existing SMS behaviour', async () => {
    const { service, prisma, sms, push, crypto } = buildDeps();
    prisma.student.findUnique.mockResolvedValue({
      id: 'student-1',
      lastName: 'Nkumu',
      middleName: null,
      firstName: 'Grace',
      school: { name: 'École Test' },
    });
    prisma.parentGuardian.findMany.mockResolvedValue([
      {
        id: 'pg-1',
        phoneNumber: crypto.encrypt('+243900000001'),
        notificationChannel: 'BOTH',
        user: { id: 'user-1', expoPushToken: 'ExponentPushToken[abc]' },
      },
    ]);

    await service.handleAttendanceRecorded({
      studentId: 'student-1',
      recordedAt: new Date('2026-07-14T07:31:00'),
      isLate: true,
    } as any);

    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(push.send).toHaveBeenCalledWith('ExponentPushToken[abc]', 'Arrivée', expect.stringContaining('Nkumu Grace'));
  });
});
