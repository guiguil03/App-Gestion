import { decodeAccessToken } from '@/lib/auth/decode-access-token';

function fakeToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature-ignored`;
}

describe('decodeAccessToken', () => {
  it('decodes a valid, non-expired access token', () => {
    const token = fakeToken({
      userId: 'user-1',
      username: 'direction1',
      role: 'DIRECTION',
      schoolId: 'school-1',
      type: 'access',
      exp: Math.floor(Date.now() / 1000) + 900,
    });

    const decoded = decodeAccessToken(token);

    expect(decoded).toEqual(
      expect.objectContaining({ userId: 'user-1', username: 'direction1', role: 'DIRECTION', schoolId: 'school-1' }),
    );
  });

  it('rejects an expired token', () => {
    const token = fakeToken({
      userId: 'user-1',
      role: 'DIRECTION',
      type: 'access',
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    expect(decodeAccessToken(token)).toBeNull();
  });

  it('rejects a refresh token presented as an access token', () => {
    const token = fakeToken({
      userId: 'user-1',
      role: 'DIRECTION',
      type: 'refresh',
      exp: Math.floor(Date.now() / 1000) + 900,
    });
    expect(decodeAccessToken(token)).toBeNull();
  });

  it('rejects a malformed token', () => {
    expect(decodeAccessToken('not-a-jwt')).toBeNull();
  });
});
