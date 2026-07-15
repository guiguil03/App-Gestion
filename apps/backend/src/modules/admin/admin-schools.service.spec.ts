import { AdminSchoolsService } from '@/modules/admin/admin-schools.service';

function buildDeps(overrides: Record<string, any> = {}) {
  const prisma = {
    school: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
    student: { count: jest.fn().mockResolvedValue(0) },
    attendanceRecord: { count: jest.fn().mockResolvedValue(0) },
    user: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'user-1' }) },
    ...overrides,
  } as any;
  const signing = { generateKeyPair: jest.fn().mockReturnValue({ privateKey: 'priv', publicKey: 'pub' }) } as any;
  const service = new AdminSchoolsService(prisma, signing);
  return { service, prisma, signing };
}

describe('AdminSchoolsService.list', () => {
  it('returns each school with its student count and today presence rate', async () => {
    const { service, prisma } = buildDeps({
      school: { findMany: jest.fn().mockResolvedValue([{ id: 'school-1', name: 'École A', deletedAt: null }]) },
      student: { count: jest.fn().mockResolvedValue(20) },
      attendanceRecord: { count: jest.fn().mockResolvedValue(10) },
    });

    const result = await service.list();

    expect(result).toEqual([{ id: 'school-1', name: 'École A', studentCount: 20, presentToday: 10, rate: 50 }]);
  });

  it('returns a 0 rate for a school with no students', async () => {
    const { service } = buildDeps({
      school: { findMany: jest.fn().mockResolvedValue([{ id: 'school-1', name: 'École A', deletedAt: null }]) },
    });

    const result = await service.list();

    expect(result[0].rate).toBe(0);
  });
});

describe('AdminSchoolsService.create', () => {
  it('creates a school with a signed keypair and its first DIRECTION account', async () => {
    const { service, prisma, signing } = buildDeps({
      school: { create: jest.fn().mockResolvedValue({ id: 'school-1', name: 'École B' }) },
    });

    const result = await service.create({ name: 'École B' });

    expect(signing.generateKeyPair).toHaveBeenCalled();
    expect(prisma.school.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'École B',
        cardSigningPrivateKey: 'priv',
        cardSigningPublicKey: 'pub',
      }),
    });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ role: 'DIRECTION', schoolId: 'school-1' }),
    });
    expect(result.school).toEqual({ id: 'school-1', name: 'École B' });
    expect(result.directionAccount.username).toBeTruthy();
    expect(result.directionAccount.password).toHaveLength(8);
  });
});
