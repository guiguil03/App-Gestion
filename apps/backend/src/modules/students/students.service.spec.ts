import { FieldEncryptionService } from '@/common/crypto/field-encryption';
import { StudentsService } from '@/modules/students/students.service';

const TEST_KEY = 'rUR8diTv1ibh3EQjrTlczr1DWUV5aAVduQeB+339dkg=';

function buildPrisma(overrides: Record<string, any> = {}) {
  return {
    student: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue({ id: 's1', schoolId: 'school-1' }),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
      ...overrides.student,
    },
    parentGuardian: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
      create: jest.fn(),
      ...overrides.parentGuardian,
    },
    schoolClass: { findFirst: jest.fn().mockResolvedValue({ id: 'class-1' }), ...overrides.schoolClass },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      ...overrides.user,
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  } as any;
}

function buildService(overrides: Record<string, any> = {}) {
  process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
  const prisma = buildPrisma(overrides);
  const crypto = new FieldEncryptionService();
  return { service: new StudentsService(prisma, crypto), prisma, crypto };
}

const rawParent = { id: 'pg-1', fullName: 'Jean Doe', relationship: 'Père', phoneNumber: '+242060000000' };

describe('StudentsService.listStudentsPaginated', () => {
  it('paginates with the requested page/pageSize, scopes to the school/class, and decrypts parent fields', async () => {
    const crypto = new FieldEncryptionService();
    process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
    const encryptedParent = {
      ...rawParent,
      phoneNumber: crypto.encrypt(rawParent.phoneNumber),
      secondaryPhoneNumber: null,
      address: null,
    };
    const { service, prisma } = buildService({
      student: {
        findMany: jest.fn().mockResolvedValue([{ id: 's1', parents: [encryptedParent] }]),
        count: jest.fn().mockResolvedValue(42),
      },
    });

    const result = await service.listStudentsPaginated('school-1', { schoolClassId: 'class-1', page: 2, pageSize: 10 });

    expect(result.total).toBe(42);
    expect(result.page).toBe(2);
    expect(result.items[0].parents[0].phoneNumber).toBe('+242060000000');
    expect(prisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId: 'school-1', schoolClassId: 'class-1', deletedAt: null },
        skip: 10,
        take: 10,
      }),
    );
  });

  it('adds a case-insensitive OR filter on name fields when search is provided', async () => {
    const { service, prisma } = buildService({ student: { findMany: jest.fn().mockResolvedValue([]) } });

    await service.listStudentsPaginated('school-1', { search: 'kim', page: 1, pageSize: 25 });

    expect(prisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { lastName: { contains: 'kim', mode: 'insensitive' } },
            { firstName: { contains: 'kim', mode: 'insensitive' } },
            { middleName: { contains: 'kim', mode: 'insensitive' } },
          ],
        }),
      }),
    );
  });

  it('omits the OR filter when search is empty or only whitespace', async () => {
    const { service, prisma } = buildService();

    await service.listStudentsPaginated('school-1', { search: '   ', page: 1, pageSize: 25 });

    const where = prisma.student.findMany.mock.calls[0][0].where;
    expect(where.OR).toBeUndefined();
  });
});

describe('StudentsService.createStudent — encryption', () => {
  it('encrypts phoneNumber/secondaryPhoneNumber/address before persisting and decrypts them in the returned student', async () => {
    const { service, prisma } = buildService({
      student: {
        create: jest.fn((args: any) =>
          Promise.resolve({
            id: 'student-1',
            parents: [{ id: 'pg-1', ...args.data.parents.create }],
          }),
        ),
      },
    });

    const result = await service.createStudent(
      {
        lastName: 'Doe',
        firstName: 'Jane',
        sex: 'F',
        dateOfBirth: '2018-01-01',
        schoolClassId: 'class-1',
        parent: { fullName: 'Jean Doe', relationship: 'Père', phoneNumber: '+242060000000', address: '12 rue X' } as any,
      } as any,
      'school-1',
    );

    const persistedData = prisma.student.create.mock.calls[0][0].data.parents.create;
    expect(persistedData.phoneNumber).not.toBe('+242060000000');
    expect(persistedData.address).not.toBe('12 rue X');
    expect(typeof persistedData.phoneNumberHash).toBe('string');

    expect(result.parents[0].phoneNumber).toBe('+242060000000');
    expect(result.parents[0].address).toBe('12 rue X');
  });
});

describe('StudentsService.provisionParentAccount — hash-based lookup', () => {
  it('looks up an existing PARENT account by phoneNumberHash, never by the encrypted phoneNumber', async () => {
    const { service, prisma } = buildService({
      parentGuardian: {
        findFirst: jest.fn().mockResolvedValue({ id: 'pg-1', studentId: 's1', fullName: 'Jean Doe', phoneNumberHash: 'abc123' }),
        update: jest.fn(),
      },
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'user-1', username: 'jean.doe' }) },
    });

    const result = await service.provisionParentAccount('s1', 'pg-1', 'school-1');

    expect(result).toEqual({ username: 'jean.doe', password: null, reused: true });
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          children: { some: { parents: { some: { phoneNumberHash: 'abc123' } } } },
        }),
      }),
    );
  });

  it('does not attempt a lookup (creates a new account) when the fiche has no phoneNumberHash yet (pre-backfill)', async () => {
    const { service, prisma } = buildService({
      parentGuardian: {
        findFirst: jest.fn().mockResolvedValue({ id: 'pg-1', studentId: 's1', fullName: 'Jean Doe', phoneNumberHash: null }),
        update: jest.fn(),
      },
      user: { findFirst: jest.fn(), create: jest.fn().mockResolvedValue({ id: 'user-2', username: 'jean.doe2' }) },
    });

    const result = await service.provisionParentAccount('s1', 'pg-1', 'school-1');

    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(result.reused).toBe(false);
  });
});
