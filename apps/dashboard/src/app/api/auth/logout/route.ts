import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth/session-cookies';

export async function POST() {
  const res = NextResponse.json({ status: 'success' });
  for (const cookie of clearAuthCookies()) {
    res.cookies.set(cookie);
  }
  return res;
}
