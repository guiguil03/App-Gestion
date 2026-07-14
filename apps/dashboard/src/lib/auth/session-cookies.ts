import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export const AUTH_COOKIE = {
  access: 'auth_token',
  refresh: 'auth_refresh',
} as const;

const isProd = process.env.NODE_ENV === 'production';

// Doit matcher les durées de vie des tokens signés côté backend
// (apps/backend/src/modules/auth/auth.service.ts : 15m / 30j).
export const ACCESS_MAX_AGE = 15 * 60;
export const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

export function buildAuthCookie(name: string, value: string, maxAge: number): ResponseCookie {
  return { name, value, httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge };
}

export function clearAuthCookies(): ResponseCookie[] {
  return [
    { name: AUTH_COOKIE.access, value: '', httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 },
    { name: AUTH_COOKIE.refresh, value: '', httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 },
  ];
}

export function getBackendUrl(): string {
  return process.env.API_URL ?? 'http://localhost:3000';
}
