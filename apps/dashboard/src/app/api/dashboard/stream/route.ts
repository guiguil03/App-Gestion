import { NextRequest } from 'next/server';
import { AUTH_COOKIE, getBackendUrl } from '@/lib/auth/session-cookies';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get(AUTH_COOKIE.access)?.value;
  if (!accessToken) {
    return new Response('Unauthorized', { status: 401 });
  }

  const upstream = await fetch(`${getBackendUrl()}/dashboard/stream`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'text/event-stream' },
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
