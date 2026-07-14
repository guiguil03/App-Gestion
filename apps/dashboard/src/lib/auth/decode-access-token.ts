export type DecodedAccessToken = {
  userId: string;
  username: string;
  role: string;
  schoolId: string | null;
  exp?: number;
};

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return atob(normalized + pad);
}

/**
 * Décode le payload JWT (userId/username/role/schoolId/exp) sans vérifier la
 * signature — aucun secret requis côté frontend. Le backend reste le seul
 * rempart réel : chaque appel API forward ce même token en Bearer et le
 * backend y valide la signature. Ce décodage ne sert qu'au routage (savoir
 * qui est connecté, rediriger si expiré) — un token forgé n'obtiendrait
 * aucune donnée réelle côté backend. Utilisable en Edge runtime (middleware)
 * et en runtime Node (route handlers) : `atob` est disponible dans les deux.
 */
export function decodeAccessToken(token: string): DecodedAccessToken | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const decoded = JSON.parse(base64UrlDecode(parts[1])) as {
      userId?: string;
      username?: string;
      role?: string;
      schoolId?: string | null;
      type?: string;
      exp?: number;
    };

    if (!decoded.userId || !decoded.role || decoded.type !== 'access') return null;
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;

    return {
      userId: decoded.userId,
      username: decoded.username ?? '',
      role: decoded.role,
      schoolId: decoded.schoolId ?? null,
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}
