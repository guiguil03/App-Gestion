import { NextRequest } from 'next/server';
import { AUTH_COOKIE, getBackendUrl } from '@/lib/auth/session-cookies';

export const dynamic = 'force-dynamic';
// Requis pour un flux SSE de longue durée sur Vercel : le runtime Node.js
// serverless par défaut tue la fonction après son timeout d'exécution (10-60s
// selon le plan), ce qui coupe la connexion bien avant que le navigateur
// n'ait de nouvel événement à recevoir — d'où le badge "Hors ligne" qui ne
// repasse jamais à "Temps réel actif". Le runtime Edge n'a pas cette limite.
export const runtime = 'edge';

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
