import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { SyncService } from '@/modules/sync/sync.service';

function buildDeps() {
  const prisma = {} as any;
  const attendance = { recordFromSync: jest.fn() } as any;
  const attendanceSessions = { createFromSync: jest.fn(), closeFromSync: jest.fn() } as any;
  const crypto = {} as any;
  const service = new SyncService(prisma, attendance, attendanceSessions, crypto);
  return { service, attendance, attendanceSessions };
}

const user = { schoolId: 'school-1', userId: 'user-1', username: 'prof1', role: 'ENSEIGNANT' } as any;

describe('SyncService.push — isolation des pointages/sessions en échec', () => {
  it("ne bloque pas les pointages suivants quand l'un d'eux déclenche une ForbiddenException", async () => {
    const { service, attendance } = buildDeps();
    attendance.recordFromSync
      .mockRejectedValueOnce(new ForbiddenException("Élève hors du périmètre de l'école"))
      .mockResolvedValueOnce({ id: 'record-ok' });

    const result = await service.push(user, {
      attendance_records: {
        created: [
          { id: 'raw-bad', student_id: 'student-bad' } as any,
          { id: 'raw-ok', student_id: 'student-ok' } as any,
        ],
      },
    });

    expect(attendance.recordFromSync).toHaveBeenCalledTimes(2);
    expect(result.rejectedAttendanceRecords).toEqual([
      { id: 'raw-bad', reason: "Élève hors du périmètre de l'école" },
    ]);
  });

  it('remonte toujours une erreur inattendue (non-Forbidden/NotFound) au lieu de la traiter comme un rejet', async () => {
    const { service, attendance } = buildDeps();
    attendance.recordFromSync.mockRejectedValueOnce(new Error('DB indisponible'));

    await expect(
      service.push(user, { attendance_records: { created: [{ id: 'raw-1', student_id: 's-1' } as any] } }),
    ).rejects.toThrow('DB indisponible');
  });

  it("une session dont la création échoue est rejetée sans bloquer les sessions/pointages suivants", async () => {
    const { service, attendance, attendanceSessions } = buildDeps();
    attendanceSessions.createFromSync
      .mockRejectedValueOnce(new ForbiddenException("Classe hors du périmètre de l'école"))
      .mockResolvedValueOnce(undefined);
    attendance.recordFromSync.mockResolvedValueOnce({ id: 'record-ok' });

    const result = await service.push(user, {
      attendance_sessions: {
        created: [
          { id: 'session-bad', school_class_id: 'class-bad' } as any,
          { id: 'session-ok', school_class_id: 'class-ok' } as any,
        ],
      },
      attendance_records: { created: [{ id: 'raw-ok', student_id: 'student-ok' } as any] },
    });

    expect(attendanceSessions.createFromSync).toHaveBeenCalledTimes(2);
    expect(attendance.recordFromSync).toHaveBeenCalledTimes(1);
    expect(result.rejectedAttendanceSessions).toEqual([
      { id: 'session-bad', reason: "Classe hors du périmètre de l'école" },
    ]);
  });

  it('une fermeture de session introuvable (NotFoundException) est rejetée sans bloquer le reste', async () => {
    const { service, attendanceSessions } = buildDeps();
    attendanceSessions.closeFromSync.mockRejectedValueOnce(new NotFoundException('Session introuvable'));

    const result = await service.push(user, {
      attendance_sessions: { updated: [{ id: 'session-missing', closed_at: 1 } as any] },
    });

    expect(result.rejectedAttendanceSessions).toEqual([{ id: 'session-missing', reason: 'Session introuvable' }]);
  });
});
