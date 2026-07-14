import { NextRequest, NextResponse } from 'next/server';
import { decodeAccessToken } from '@/lib/auth/decode-access-token';
import { AUTH_COOKIE } from '@/lib/auth/session-cookies';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE.access)?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const session = decodeAccessToken(token);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, session });
}
