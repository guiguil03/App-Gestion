import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_MAX_AGE, AUTH_COOKIE, REFRESH_MAX_AGE, buildAuthCookie, getBackendUrl } from '@/lib/auth/session-cookies';

type LoginUpstream = {
  accessToken?: string;
  refreshToken?: string;
  role?: string;
  schoolId?: string | null;
  message?: string;
};

export async function POST(req: NextRequest) {
  const body = await req.json();

  const upstream = await fetch(`${getBackendUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await upstream.json()) as LoginUpstream;

  if (!upstream.ok) {
    return NextResponse.json({ message: data.message ?? 'Identifiants incorrects' }, { status: upstream.status });
  }

  if (data.role !== 'DIRECTION' && data.role !== 'ADMIN') {
    return NextResponse.json({ message: "Ce compte n'a pas accès à ce dashboard" }, { status: 403 });
  }

  if (!data.accessToken || !data.refreshToken) {
    return NextResponse.json({ message: 'Réponse de connexion invalide' }, { status: 502 });
  }

  const res = NextResponse.json({ status: 'success' });
  res.cookies.set(buildAuthCookie(AUTH_COOKIE.access, data.accessToken, ACCESS_MAX_AGE));
  res.cookies.set(buildAuthCookie(AUTH_COOKIE.refresh, data.refreshToken, REFRESH_MAX_AGE));
  return res;
}
