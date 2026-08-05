import { ForbiddenException } from '@nestjs/common';

import { StudentsController } from '@/modules/students/students.controller';

const JPEG_BUFFER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

function buildDeps() {
  const studentsService = {
    assertParentOwnsStudent: jest.fn(),
    assertBelongsToSchool: jest.fn().mockResolvedValue({ id: 'student-1' }),
    setPhoto: jest.fn().mockResolvedValue({ id: 'student-1', photoUrl: 'https://example.test/photo.jpg' }),
  } as any;
  const tenant = { schoolId: 'school-1' } as any;
  const photoStorage = { upload: jest.fn().mockResolvedValue('https://example.test/photo.jpg') } as any;
  const audit = { log: jest.fn() } as any;
  const controller = new StudentsController(studentsService, tenant, photoStorage, audit);
  return { controller, studentsService, photoStorage };
}

const photoFile = { buffer: JPEG_BUFFER, mimetype: 'image/jpeg' } as any;

describe('StudentsController.uploadPhoto — permission ELEVE', () => {
  it("un compte ELEVE peut uploader sa propre photo (studentId === user.studentId)", async () => {
    const { controller, studentsService, photoStorage } = buildDeps();
    const user = { role: 'ELEVE', studentId: 'student-1' } as any;

    const result = await controller.uploadPhoto('student-1', user, photoFile);

    expect(photoStorage.upload).toHaveBeenCalled();
    expect(studentsService.setPhoto).toHaveBeenCalledWith('student-1', 'school-1', expect.any(String));
    expect(result).toEqual({ id: 'student-1', photoUrl: 'https://example.test/photo.jpg' });
  });

  it("un compte ELEVE ne peut PAS uploader la photo d'un autre élève", async () => {
    const { controller, studentsService, photoStorage } = buildDeps();
    const user = { role: 'ELEVE', studentId: 'student-1' } as any;

    await expect(controller.uploadPhoto('student-2', user, photoFile)).rejects.toThrow(ForbiddenException);
    expect(photoStorage.upload).not.toHaveBeenCalled();
    expect(studentsService.setPhoto).not.toHaveBeenCalled();
  });

  it('DIRECTION peut toujours uploader la photo de n’importe quel élève de son école (comportement inchangé)', async () => {
    const { controller, studentsService } = buildDeps();
    const user = { role: 'DIRECTION', studentId: null } as any;

    await controller.uploadPhoto('student-2', user, photoFile);

    expect(studentsService.setPhoto).toHaveBeenCalledWith('student-2', 'school-1', expect.any(String));
  });
});
