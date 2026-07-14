import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decodeAccessToken } from '@/lib/auth/decode-access-token';
import { AUTH_COOKIE } from '@/lib/auth/session-cookies';

const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const token = request.cookies.get(AUTH_COOKIE.access)?.value;

  if (!token) {
    return isPublic ? NextResponse.next() : NextResponse.redirect(new URL('/login', request.url));
  }

  const session = decodeAccessToken(token);
  if (!session) {
    if (isPublic) return NextResponse.next();
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete(AUTH_COOKIE.access);
    res.cookies.delete(AUTH_COOKIE.refresh);
    return res;
  }

  if (isPublic || pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
