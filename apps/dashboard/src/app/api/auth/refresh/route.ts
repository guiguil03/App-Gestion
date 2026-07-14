import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_MAX_AGE,
  AUTH_COOKIE,
  REFRESH_MAX_AGE,
  buildAuthCookie,
  clearAuthCookies,
  getBackendUrl,
} from '@/lib/auth/session-cookies';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(AUTH_COOKIE.refresh)?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: 'Session expirée' }, { status: 401 });
  }

  const upstream = await fetch(`${getBackendUrl()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!upstream.ok) {
    const res = NextResponse.json({ message: 'Session expirée' }, { status: 401 });
    for (const cookie of clearAuthCookies()) res.cookies.set(cookie);
    return res;
  }

  const data = (await upstream.json()) as { accessToken: string; refreshToken: string };
  const res = NextResponse.json({ status: 'success' });
  res.cookies.set(buildAuthCookie(AUTH_COOKIE.access, data.accessToken, ACCESS_MAX_AGE));
  res.cookies.set(buildAuthCookie(AUTH_COOKIE.refresh, data.refreshToken, REFRESH_MAX_AGE));
  return res;
}
