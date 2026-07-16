import { CardSigningService } from '@/modules/cards/card-signing.service';
import { CardsService } from '@/modules/cards/cards.service';

function buildPrisma(overrides: Record<string, any> = {}) {
  return {
    student: { findMany: jest.fn() },
    studentCard: { create: jest.fn(), updateMany: jest.fn() },
    ...overrides,
  } as any;
}

function buildSigning() {
  return { toQrString: jest.fn(() => 'qr-string') } as unknown as CardSigningService;
}

describe('CardsService', () => {
  describe('listForSchool', () => {
    it('splits each student\'s cards into activeCard and history', async () => {
      const activeCard = { id: 'card-2', studentId: 's1', signature: 'sig-2', issuedAt: new Date('2026-02-01'), revoked: false, updatedAt: new Date('2026-02-01') };
      const revokedCard = { id: 'card-1', studentId: 's1', signature: 'sig-1', issuedAt: new Date('2026-01-01'), revoked: true, updatedAt: new Date('2026-01-15') };
      const prisma = buildPrisma({
        student: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 's1',
              lastName: 'Doe',
              middleName: null,
              firstName: 'Jane',
              photoUrl: null,
              schoolClass: { id: 'c1', name: '6e A', promotion: '2026' },
              cards: [activeCard, revokedCard],
            },
          ]),
        },
      });
      const service = new CardsService(prisma, buildSigning(), {} as any);

      const result = await service.listForSchool('school-1');

      expect(result).toEqual([
        {
          student: {
            id: 's1',
            lastName: 'Doe',
            middleName: null,
            firstName: 'Jane',
            photoUrl: null,
            schoolClass: { id: 'c1', name: '6e A', promotion: '2026' },
          },
          activeCard: { id: 'card-2', issuedAt: activeCard.issuedAt, qrCode: 'qr-string' },
          history: [{ id: 'card-1', issuedAt: revokedCard.issuedAt, revokedAt: revokedCard.updatedAt }],
        },
      ]);
    });

    it('returns activeCard: null for a student without any card', async () => {
      const prisma = buildPrisma({
        student: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 's2',
              lastName: 'Smith',
              middleName: null,
              firstName: 'John',
              photoUrl: null,
              schoolClass: { id: 'c1', name: '6e A', promotion: '2026' },
              cards: [],
            },
          ]),
        },
      });
      const service = new CardsService(prisma, buildSigning(), {} as any);

      const result = await service.listForSchool('school-1');

      expect(result[0].activeCard).toBeNull();
      expect(result[0].history).toEqual([]);
    });
  });

  describe('issueBatch', () => {
    it('only issues cards for students without an active card', async () => {
      const prisma = buildPrisma({
        student: {
          findMany: jest.fn().mockResolvedValue([
            { id: 's1', cards: [] },
            { id: 's2', cards: [{ id: 'card-x' }] },
          ]),
        },
      });
      const service = new CardsService(prisma, buildSigning(), {} as any);
      const issueCardSpy = jest.spyOn(service, 'issueCard').mockResolvedValue({} as any);

      const result = await service.issueBatch('class-1', 'school-1');

      expect(issueCardSpy).toHaveBeenCalledTimes(1);
      expect(issueCardSpy).toHaveBeenCalledWith('s1', 'school-1');
      expect(result).toEqual({ issuedCount: 1 });
    });

    it('is a no-op when every student already has an active card', async () => {
      const prisma = buildPrisma({
        student: {
          findMany: jest.fn().mockResolvedValue([{ id: 's1', cards: [{ id: 'card-x' }] }]),
        },
      });
      const service = new CardsService(prisma, buildSigning(), {} as any);
      const issueCardSpy = jest.spyOn(service, 'issueCard').mockResolvedValue({} as any);

      const result = await service.issueBatch('class-1', 'school-1');

      expect(issueCardSpy).not.toHaveBeenCalled();
      expect(result).toEqual({ issuedCount: 0 });
    });
  });
});
