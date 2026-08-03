import { NotFoundException } from '@nestjs/common';

import { SchoolsService } from '@/modules/schools/schools.service';

function buildPrisma(overrides: Record<string, any> = {}) {
  return {
    school: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ...overrides,
  } as any;
}

describe('SchoolsService.updateAttendanceSettings', () => {
  it('persists the scan window', async () => {
    const prisma = buildPrisma({
      school: {
        findUnique: jest.fn().mockResolvedValue({ id: 'school-1' }),
        update: jest.fn().mockResolvedValue({
          scanWindowStart: '06:00',
          scanWindowEnd: '18:00',
        }),
      },
    });
    const service = new SchoolsService(prisma);

    const result = await service.updateAttendanceSettings('school-1', {
      scanWindowStart: '06:00',
      scanWindowEnd: '18:00',
    });

    expect(prisma.school.update).toHaveBeenCalledWith({
      where: { id: 'school-1' },
      data: { scanWindowStart: '06:00', scanWindowEnd: '18:00' },
    });
    expect(result).toEqual({ scanWindowStart: '06:00', scanWindowEnd: '18:00' });
  });

  it('throws when the school does not exist', async () => {
    const prisma = buildPrisma({ school: { findUnique: jest.fn().mockResolvedValue(null) } });
    const service = new SchoolsService(prisma);

    await expect(service.updateAttendanceSettings('missing', {})).rejects.toThrow(NotFoundException);
  });
});
