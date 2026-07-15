import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, buildAuthCookie, REFRESH_MAX_AGE } from '@/lib/auth/session-cookies';

export async function POST(req: NextRequest) {
  const { schoolId } = (await req.json()) as { schoolId?: string };
  if (!schoolId) {
    return NextResponse.json({ message: 'schoolId requis' }, { status: 400 });
  }

  const res = NextResponse.json({ status: 'success' });
  res.cookies.set(buildAuthCookie(AUTH_COOKIE.adminSchool, schoolId, REFRESH_MAX_AGE));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ status: 'success' });
  res.cookies.delete(AUTH_COOKIE.adminSchool);
  return res;
}
