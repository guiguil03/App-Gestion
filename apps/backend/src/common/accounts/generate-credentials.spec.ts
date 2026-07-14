import { generatePassword, generateUniqueUsername, normalizeUsernamePart } from '@/common/accounts/generate-credentials';

describe('normalizeUsernamePart', () => {
  it('strips accents, spaces and lowercases', () => {
    expect(normalizeUsernamePart('Jean-Éric Ndélé')).toBe('jeanericndele');
  });
});

describe('generatePassword', () => {
  it('generates an 8-character password by default with no ambiguous characters', () => {
    const password = generatePassword();
    expect(password).toHaveLength(8);
    expect(password).not.toMatch(/[0O1lI]/);
  });
});

describe('generateUniqueUsername', () => {
  it('appends a numeric suffix when the base username is taken', async () => {
    const findUnique = jest.fn().mockResolvedValueOnce({ id: 'existing' }).mockResolvedValueOnce(null);
    const prisma = { user: { findUnique } } as any;

    const username = await generateUniqueUsername(prisma, 'Jean', 'Dupont');

    expect(username).toBe('jean.dupont2');
    expect(findUnique).toHaveBeenCalledTimes(2);
  });
});
