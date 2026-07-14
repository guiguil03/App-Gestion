import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, getBackendUrl } from '@/lib/auth/session-cookies';

const SKIP_REQUEST_HEADERS = new Set([
  'host',
  'origin',
  'referer',
  'connection',
  'transfer-encoding',
  'cookie',
  'authorization',
]);
const SKIP_RESPONSE_HEADERS = new Set(['access-control-allow-origin', 'content-encoding', 'content-length', 'transfer-encoding']);

async function proxy(req: NextRequest, path: string[]) {
  const search = req.nextUrl.search;
  const target = `${getBackendUrl()}/${path.join('/')}${search}`;

  const headers: Record<string, string> = { 'accept-encoding': 'identity' };
  req.headers.forEach((value, key) => {
    if (!SKIP_REQUEST_HEADERS.has(key.toLowerCase())) headers[key] = value;
  });

  const accessToken = req.cookies.get(AUTH_COOKIE.access)?.value;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const hasBody = !['GET', 'HEAD'].includes(req.method);
  const body = hasBody ? await req.text() : undefined;

  const upstream = await fetch(target, { method: req.method, headers, body });

  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) resHeaders.set(key, value);
  });

  const responseBody = await upstream.arrayBuffer();
  return new NextResponse(responseBody, { status: upstream.status, statusText: upstream.statusText, headers: resHeaders });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}
export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}
export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}
