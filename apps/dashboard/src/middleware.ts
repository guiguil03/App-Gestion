import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decodeAccessToken } from '@/lib/auth/decode-access-token';
import { AUTH_COOKIE } from '@/lib/auth/session-cookies';

const PUBLIC_PATHS = ['/login'];

function homeFor(role: string): string {
  return role === 'ADMIN' ? '/admin' : '/dashboard';
}

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
    res.cookies.delete(AUTH_COOKIE.adminSchool);
    return res;
  }

  if (isPublic || pathname === '/') {
    return NextResponse.redirect(new URL(homeFor(session.role), request.url));
  }

  // `/admin` (liste des écoles, création) est réservé à ADMIN — un compte
  // DIRECTION n'a pas de vue transverse. `/dashboard/*` reste accessible aux
  // deux : DIRECTION via son école propre, ADMIN via l'école sélectionnée
  // (cookie admin_school_id, voir /admin/select-school et le proxy [...path]).
  if (pathname.startsWith('/admin') && session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL(homeFor(session.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
