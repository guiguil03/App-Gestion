import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

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
  const CORNERS = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 1 },
    { lat: 1, lng: 1 },
    { lat: 1, lng: 0 },
  ];

  it('persists the 4 corners and scan window', async () => {
    const prisma = buildPrisma({
      school: {
        findUnique: jest.fn().mockResolvedValue({ id: 'school-1' }),
        update: jest.fn().mockResolvedValue({
          geofenceCorners: CORNERS,
          scanWindowStart: '06:00',
          scanWindowEnd: '18:00',
        }),
      },
    });
    const service = new SchoolsService(prisma);

    const result = await service.updateAttendanceSettings('school-1', {
      geofenceCorners: CORNERS,
      scanWindowStart: '06:00',
      scanWindowEnd: '18:00',
    });

    expect(prisma.school.update).toHaveBeenCalledWith({
      where: { id: 'school-1' },
      data: { geofenceCorners: CORNERS, scanWindowStart: '06:00', scanWindowEnd: '18:00' },
    });
    expect(result).toEqual({ geofenceCorners: CORNERS, scanWindowStart: '06:00', scanWindowEnd: '18:00' });
  });

  it('clears the geofence when corners is explicitly null', async () => {
    const prisma = buildPrisma({
      school: {
        findUnique: jest.fn().mockResolvedValue({ id: 'school-1' }),
        update: jest.fn().mockResolvedValue({ geofenceCorners: null, scanWindowStart: null, scanWindowEnd: null }),
      },
    });
    const service = new SchoolsService(prisma);

    await service.updateAttendanceSettings('school-1', { geofenceCorners: null });

    expect(prisma.school.update).toHaveBeenCalledWith({
      where: { id: 'school-1' },
      data: { geofenceCorners: Prisma.JsonNull, scanWindowStart: undefined, scanWindowEnd: undefined },
    });
  });

  it('throws when the school does not exist', async () => {
    const prisma = buildPrisma({ school: { findUnique: jest.fn().mockResolvedValue(null) } });
    const service = new SchoolsService(prisma);

    await expect(service.updateAttendanceSettings('missing', {})).rejects.toThrow(NotFoundException);
  });
});
