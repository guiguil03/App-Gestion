import { randomInt } from 'node:crypto';

import type { PrismaService } from '@/database/prisma.service';

// Sans caractères ambigus à la lecture/saisie (0/O, 1/l/I).
const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export function normalizeUsernamePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function generatePassword(length = 8): string {
  let password = '';
  for (let i = 0; i < length; i++) {
    password += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return password;
}

export async function generateUniqueUsername(
  prisma: Pick<PrismaService, 'user'>,
  firstName: string,
  lastName: string,
): Promise<string> {
  const base = lastName
    ? `${normalizeUsernamePart(firstName)}.${normalizeUsernamePart(lastName)}`
    : normalizeUsernamePart(firstName);
  let candidate = base;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    suffix++;
    candidate = `${base}${suffix}`;
  }
  return candidate;
}
