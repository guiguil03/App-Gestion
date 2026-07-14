# Dashboard Direction — Frontend (apps/dashboard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Next.js 14 web dashboard for the DIRECTION role, consuming the backend endpoints added by the companion backend plan (`docs/superpowers/plans/2026-07-14-direction-dashboard-backend.md`, already merged to `main`), reproducing the design system of the reference project at `../frontend` (sidebar, KPI cards, Tailwind zinc/emerald palette) with cookie-based auth via Next.js route handlers.

**Architecture:** New standalone Next.js 14 App Router app at `apps/dashboard` (independent `package.json`, like `apps/backend`/`apps/mobile` — no shared workspace). The JWT never touches client JS: Next.js route handlers under `app/api/` proxy every backend call, injecting `Authorization: Bearer <token>` from an httpOnly cookie. `middleware.ts` protects `/dashboard/*` by decoding that cookie (no signature verification client-side — the backend is the real gate). Server state via React Query; live updates via a native `EventSource` hitting a dedicated streaming proxy route (not the generic one, which buffers the whole body).

**Tech Stack:** Next.js 14 (App Router), TypeScript strict, Tailwind CSS (utility classes only, no component library), `@tanstack/react-query` v5, `axios`, `react-hook-form` + `zod`, `recharts`, `lucide-react`, Jest + `ts-jest` (unit tests for `lib/` pure logic only — no component tests, matching the reference project's own testing scope).

---

## Before you start

Read `docs/superpowers/specs/2026-07-14-direction-dashboard-design.md` for the full rationale. Key facts this plan assumes:

- The backend (`apps/backend`) already exposes, all under `JwtAuthGuard`+`RolesGuard`+`@Roles('DIRECTION')` (see the backend plan for exact shapes):
  - `POST /auth/login` → `{ accessToken, refreshToken, role, schoolId, studentId }` (no `username`/name fields — `User` only has `username`, no first/last name)
  - `POST /auth/refresh` → same shape, body `{ refreshToken }`
  - `GET /dashboard/overview` → `{ totalStudents, presentCount, lateCount, absentCount, rate }`
  - `GET /dashboard/trend?period=week|month` → `{ date: string; rate: number }[]`
  - `GET /dashboard/classes-comparison` → `{ schoolClassId, name, totalStudents, presentCount, rate }[]`
  - `GET /dashboard/alerts` → `{ unjustifiedAbsences: [...], repeatedLateness: [...] }`
  - `GET /dashboard/stream` (SSE, NestJS `@Sse()`) — events carry a `type` field (`attendance.recorded` | `absence.marked`), which NestJS maps to the SSE `event:` line, **not** the default unnamed `message` event. A browser `EventSource` must use `addEventListener('attendance.recorded', ...)`, not `onmessage`.
  - `GET/POST /classes`, `PATCH/DELETE /classes/:id`, `POST/DELETE /classes/:id/teachers/:userId`
  - `GET/POST /staff`, `PATCH /staff/:id/disable`
  - `GET /absences`, `PATCH /absences/:id/justify` (body `{ reason }`)
- There is **no** `GET /auth/profile` or `POST /auth/logout` backend endpoint. Session hydration is done by decoding the access-token cookie server-side (the JWT payload already has `userId`/`username`/`role`/`schoolId`) — no backend round-trip needed. Logout just clears cookies (JWTs are stateless here, nothing to revoke server-side).
- Backend has no route prefix (`/auth/login`, not `/api/v1/auth/login`) and CORS is already open — irrelevant anyway since the dashboard never calls the backend directly from the browser, only from its own Next.js route handlers (server-to-server).
- This is v1 for the `DIRECTION` role only. No student/parent-facing pages, no multi-school switcher (matches spec's explicit scope cuts).

## File Structure

```
apps/dashboard/
  package.json
  next.config.js
  tsconfig.json
  next-env.d.ts
  tailwind.config.ts
  postcss.config.js
  jest.config.cjs
  .env.example
  src/
    middleware.ts
    app/
      layout.tsx
      globals.css
      page.tsx                                  → redirects to /login (middleware normally beats it)
      (auth)/login/page.tsx
      (dashboard)/dashboard/layout.tsx           → wraps children with <Sidebar>
      (dashboard)/dashboard/page.tsx             → overview
      (dashboard)/dashboard/classes/page.tsx
      (dashboard)/dashboard/personnel/page.tsx
      (dashboard)/dashboard/absences/page.tsx
      (dashboard)/dashboard/profil/page.tsx
      api/
        auth/login/route.ts
        auth/logout/route.ts
        auth/refresh/route.ts
        auth/session/route.ts
        dashboard/stream/route.ts                → dedicated SSE streaming proxy
        [...path]/route.ts                       → generic REST proxy
    components/
      layout/sidebar.tsx
      ui/kpi-card.tsx
    providers/
      query-provider.tsx
      auth-provider.tsx
    lib/
      utils.ts                                   → cn() helper
      utils.test.ts
      auth/session-cookies.ts
      auth/decode-access-token.ts
      auth/decode-access-token.test.ts
      api/client.ts                               → axios instance + 401 refresh-retry
      api/auth.ts
      api/dashboard.ts
      api/classes.ts
      api/staff.ts
      api/absences.ts
      hooks/useDashboard.ts
      hooks/useClasses.ts
      hooks/useStaff.ts
      hooks/useAbsences.ts
      realtime/useDashboardStream.ts
    types/
      auth.ts
      dashboard.ts
      classes.ts
      staff.ts
      absences.ts
```

---

### Task 1: Scaffold the Next.js app

**Files:**
- Create: `apps/dashboard/package.json`, `next.config.js`, `tsconfig.json`, `next-env.d.ts`, `tailwind.config.ts`, `postcss.config.js`, `jest.config.cjs`, `.env.example`
- Create: `apps/dashboard/src/app/globals.css`, `apps/dashboard/src/app/layout.tsx`, `apps/dashboard/src/app/page.tsx`
- Create: `apps/dashboard/src/lib/utils.ts`, `apps/dashboard/src/lib/utils.test.ts`

- [ ] **Step 1: `package.json`**

Create `apps/dashboard/package.json`:

```json
{
  "name": "presence-scolaire-dashboard",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "type-check": "tsc --noEmit",
    "test": "jest"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.9.0",
    "@tanstack/react-query": "^5.51.1",
    "@tanstack/react-query-devtools": "^5.51.1",
    "axios": "^1.7.2",
    "clsx": "^2.1.1",
    "lucide-react": "^0.417.0",
    "next": "14.2.5",
    "react": "^18",
    "react-dom": "^18",
    "react-hook-form": "^7.52.1",
    "recharts": "^2.12.7",
    "tailwind-merge": "^2.4.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/jest": "^29.5.14",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.4.19",
    "jest": "^29.7.0",
    "postcss": "^8.4.40",
    "tailwindcss": "^3.4.6",
    "ts-jest": "^29.2.5",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Next.js, TypeScript, Tailwind, PostCSS config**

Create `apps/dashboard/next.config.js`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
```

Create `apps/dashboard/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `apps/dashboard/next-env.d.ts`:

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

Create `apps/dashboard/tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
    './src/providers/**/*.{ts,tsx}',
  ],
  theme: { extend: {} },
  plugins: [],
};

export default config;
```

Create `apps/dashboard/postcss.config.js`:

```js
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

Create `apps/dashboard/jest.config.cjs`:

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
```

Create `apps/dashboard/.env.example`:

```
API_URL=http://localhost:3000
```

- [ ] **Step 3: Global styles, root layout, root page**

Create `apps/dashboard/src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-slate-50 text-slate-900 antialiased;
  }
}
```

Create `apps/dashboard/src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Présence Scolaire — Direction',
  description: 'Tableau de bord de la direction',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
```

(Providers are added in Task 5, once they exist.)

Create `apps/dashboard/src/app/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/login');
}
```

- [ ] **Step 4: `cn()` utility + test**

Create `apps/dashboard/src/lib/utils.test.ts`:

```ts
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('merges class names and resolves Tailwind conflicts (last wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('drops falsy values', () => {
    expect(cn('text-sm', false && 'hidden', undefined, 'font-bold')).toBe('text-sm font-bold');
  });
});
```

Create `apps/dashboard/src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: Install and verify**

Run: `cd apps/dashboard && npm install`
Expected: installs without error.

Run: `cd apps/dashboard && npm test`
Expected: `PASS src/lib/utils.test.ts`, 2 tests passing.

Run: `cd apps/dashboard && npm run build`
Expected: build succeeds (`○ /` and no other routes yet — that's expected, more are added in later tasks).

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard
git commit -m "chore(dashboard): scaffold Next.js app"
```

---

### Task 2: Auth foundation — cookies helper + JWT decode

**Files:**
- Create: `apps/dashboard/src/types/auth.ts`
- Create: `apps/dashboard/src/lib/auth/session-cookies.ts`
- Create: `apps/dashboard/src/lib/auth/decode-access-token.ts`
- Create: `apps/dashboard/src/lib/auth/decode-access-token.test.ts`

- [ ] **Step 1: Types**

Create `apps/dashboard/src/types/auth.ts`:

```ts
export type AuthSession = {
  userId: string;
  username: string;
  role: string;
  schoolId: string | null;
};
```

- [ ] **Step 2: Cookie helpers (no test — trivial constant/object builders, covered indirectly by later route tasks)**

Create `apps/dashboard/src/lib/auth/session-cookies.ts`:

```ts
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export const AUTH_COOKIE = {
  access: 'auth_token',
  refresh: 'auth_refresh',
} as const;

const isProd = process.env.NODE_ENV === 'production';

// Doit matcher les durées de vie des tokens signés côté backend
// (apps/backend/src/modules/auth/auth.service.ts : 15m / 30j).
export const ACCESS_MAX_AGE = 15 * 60;
export const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

export function buildAuthCookie(name: string, value: string, maxAge: number): ResponseCookie {
  return { name, value, httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge };
}

export function clearAuthCookies(): ResponseCookie[] {
  return [
    { name: AUTH_COOKIE.access, value: '', httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 },
    { name: AUTH_COOKIE.refresh, value: '', httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 },
  ];
}

export function getBackendUrl(): string {
  return process.env.API_URL ?? 'http://localhost:3000';
}
```

- [ ] **Step 3: Write the failing test for JWT decoding**

Create `apps/dashboard/src/lib/auth/decode-access-token.test.ts`:

```ts
import { decodeAccessToken } from '@/lib/auth/decode-access-token';

function fakeToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature-ignored`;
}

describe('decodeAccessToken', () => {
  it('decodes a valid, non-expired access token', () => {
    const token = fakeToken({
      userId: 'user-1',
      username: 'direction1',
      role: 'DIRECTION',
      schoolId: 'school-1',
      type: 'access',
      exp: Math.floor(Date.now() / 1000) + 900,
    });

    const decoded = decodeAccessToken(token);

    expect(decoded).toEqual(
      expect.objectContaining({ userId: 'user-1', username: 'direction1', role: 'DIRECTION', schoolId: 'school-1' }),
    );
  });

  it('rejects an expired token', () => {
    const token = fakeToken({
      userId: 'user-1',
      role: 'DIRECTION',
      type: 'access',
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    expect(decodeAccessToken(token)).toBeNull();
  });

  it('rejects a refresh token presented as an access token', () => {
    const token = fakeToken({
      userId: 'user-1',
      role: 'DIRECTION',
      type: 'refresh',
      exp: Math.floor(Date.now() / 1000) + 900,
    });
    expect(decodeAccessToken(token)).toBeNull();
  });

  it('rejects a malformed token', () => {
    expect(decodeAccessToken('not-a-jwt')).toBeNull();
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `cd apps/dashboard && npm test -- decode-access-token`
Expected: FAIL — `Cannot find module '@/lib/auth/decode-access-token'`

- [ ] **Step 5: Implement**

Create `apps/dashboard/src/lib/auth/decode-access-token.ts`:

```ts
export type DecodedAccessToken = {
  userId: string;
  username: string;
  role: string;
  schoolId: string | null;
  exp?: number;
};

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return atob(normalized + pad);
}

/**
 * Décode le payload JWT (userId/username/role/schoolId/exp) sans vérifier la
 * signature — aucun secret requis côté frontend. Le backend reste le seul
 * rempart réel : chaque appel API forward ce même token en Bearer et le
 * backend y valide la signature. Ce décodage ne sert qu'au routage (savoir
 * qui est connecté, rediriger si expiré) — un token forgé n'obtiendrait
 * aucune donnée réelle côté backend. Utilisable en Edge runtime (middleware)
 * et en runtime Node (route handlers) : `atob` est disponible dans les deux.
 */
export function decodeAccessToken(token: string): DecodedAccessToken | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const decoded = JSON.parse(base64UrlDecode(parts[1])) as {
      userId?: string;
      username?: string;
      role?: string;
      schoolId?: string | null;
      type?: string;
      exp?: number;
    };

    if (!decoded.userId || !decoded.role || decoded.type !== 'access') return null;
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;

    return {
      userId: decoded.userId,
      username: decoded.username ?? '',
      role: decoded.role,
      schoolId: decoded.schoolId ?? null,
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 6: Run it to verify it passes**

Run: `cd apps/dashboard && npm test -- decode-access-token`
Expected: PASS, 4 tests.

- [ ] **Step 7: Commit**

```bash
git add apps/dashboard/src/types/auth.ts apps/dashboard/src/lib/auth
git commit -m "feat(dashboard): add cookie helpers and stateless JWT decoding"
```

---

### Task 3: Auth API routes + backend proxies

**Files:**
- Create: `apps/dashboard/src/app/api/auth/login/route.ts`
- Create: `apps/dashboard/src/app/api/auth/logout/route.ts`
- Create: `apps/dashboard/src/app/api/auth/refresh/route.ts`
- Create: `apps/dashboard/src/app/api/auth/session/route.ts`
- Create: `apps/dashboard/src/app/api/[...path]/route.ts`
- Create: `apps/dashboard/src/app/api/dashboard/stream/route.ts`

- [ ] **Step 1: Login route**

Create `apps/dashboard/src/app/api/auth/login/route.ts`:

```ts
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

  if (data.role !== 'DIRECTION') {
    return NextResponse.json({ message: "Ce compte n'a pas accès au dashboard direction" }, { status: 403 });
  }

  if (!data.accessToken || !data.refreshToken) {
    return NextResponse.json({ message: 'Réponse de connexion invalide' }, { status: 502 });
  }

  const res = NextResponse.json({ status: 'success' });
  res.cookies.set(buildAuthCookie(AUTH_COOKIE.access, data.accessToken, ACCESS_MAX_AGE));
  res.cookies.set(buildAuthCookie(AUTH_COOKIE.refresh, data.refreshToken, REFRESH_MAX_AGE));
  return res;
}
```

- [ ] **Step 2: Logout route**

Create `apps/dashboard/src/app/api/auth/logout/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth/session-cookies';

export async function POST() {
  const res = NextResponse.json({ status: 'success' });
  for (const cookie of clearAuthCookies()) {
    res.cookies.set(cookie);
  }
  return res;
}
```

- [ ] **Step 3: Refresh route**

Create `apps/dashboard/src/app/api/auth/refresh/route.ts`:

```ts
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
```

- [ ] **Step 4: Session route (no backend call — decodes the cookie)**

Create `apps/dashboard/src/app/api/auth/session/route.ts`:

```ts
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
```

- [ ] **Step 5: Generic REST proxy**

Create `apps/dashboard/src/app/api/[...path]/route.ts`:

```ts
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
```

- [ ] **Step 6: Dedicated SSE streaming proxy**

The generic proxy above buffers the whole response with `arrayBuffer()`, which would defeat streaming. The dashboard's live-updates endpoint needs its own route that pipes the upstream body through as it arrives.

Create `apps/dashboard/src/app/api/dashboard/stream/route.ts`:

```ts
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
```

- [ ] **Step 7: Verify it builds**

Run: `cd apps/dashboard && npm run build`
Expected: build succeeds, route list includes `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`, `/api/auth/session`, `/api/dashboard/stream`, `/api/[...path]`.

- [ ] **Step 8: Commit**

```bash
git add apps/dashboard/src/app/api
git commit -m "feat(dashboard): add auth routes and backend proxies (REST + SSE)"
```

---

### Task 4: Route protection middleware

**Files:**
- Create: `apps/dashboard/src/middleware.ts`

- [ ] **Step 1: Implement**

Create `apps/dashboard/src/middleware.ts`:

```ts
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
```

Note (not a bug, a documented v1 limitation): the middleware only checks whether the 15-minute access token is still valid — it cannot silently refresh it (no easy way to set cookies and retry a navigation inline). A page navigation after the access token expires bounces to `/login` even if the 30-day refresh token is still valid. Within an already-loaded page, API calls refresh transparently instead (Task 5's `apiClient` 401-retry interceptor) — only full page navigations are affected. Acceptable for v1; revisit if it proves annoying in practice.

- [ ] **Step 2: Verify it builds**

Run: `cd apps/dashboard && npm run build`
Expected: build succeeds, no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/src/middleware.ts
git commit -m "feat(dashboard): protect /dashboard routes by role via middleware"
```

---

### Task 5: API client, providers, login page

**Files:**
- Create: `apps/dashboard/src/lib/api/client.ts`
- Create: `apps/dashboard/src/lib/api/auth.ts`
- Create: `apps/dashboard/src/providers/query-provider.tsx`
- Create: `apps/dashboard/src/providers/auth-provider.tsx`
- Modify: `apps/dashboard/src/app/layout.tsx`
- Create: `apps/dashboard/src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Axios client with 401 refresh-retry**

Create `apps/dashboard/src/lib/api/client.ts`:

```ts
import axios, { AxiosError } from 'axios';

export const apiClient = axios.create({ baseURL: '/api', withCredentials: true });

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then((res) => res.ok)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retried) {
      originalRequest._retried = true;
      const refreshed = await refreshSession();
      if (refreshed) {
        return apiClient(originalRequest);
      }
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
```

- [ ] **Step 2: Auth API wrapper**

Create `apps/dashboard/src/lib/api/auth.ts`:

```ts
import { apiClient } from '@/lib/api/client';
import type { AuthSession } from '@/types/auth';

export const authApi = {
  login: async (username: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { username, password });
    return data;
  },
  logout: () => apiClient.post('/auth/logout'),
  session: async () => {
    const { data } = await apiClient.get<{ authenticated: boolean; session?: AuthSession }>('/auth/session');
    return data;
  },
};
```

- [ ] **Step 3: Providers**

Create `apps/dashboard/src/providers/query-provider.tsx`:

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 5_000 } },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
```

Create `apps/dashboard/src/providers/auth-provider.tsx`:

```tsx
'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import type { AuthSession } from '@/types/auth';

type AuthContextValue = {
  session: AuthSession | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authApi
      .session()
      .then((data) => setSession(data.authenticated ? (data.session ?? null) : null))
      .catch(() => setSession(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      await authApi.login(username, password);
      const data = await authApi.session();
      setSession(data.session ?? null);
      router.push('/dashboard');
    },
    [router],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setSession(null);
    router.push('/login');
  }, [router]);

  return <AuthContext.Provider value={{ session, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
```

- [ ] **Step 4: Wire providers into the root layout**

Replace `apps/dashboard/src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { AuthProvider } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Présence Scolaire — Direction',
  description: 'Tableau de bord de la direction',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Login page**

Create `apps/dashboard/src/app/(auth)/login/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/providers/auth-provider';

const loginSchema = z.object({
  username: z.string().min(1, 'Identifiant requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginForm) {
    setError(null);
    try {
      await login(values.username, values.password);
    } catch {
      setError('Identifiants incorrects');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-5"
      >
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Présence Scolaire</h1>
          <p className="text-sm text-zinc-500 mt-1">Espace direction</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">Identifiant</label>
          <input
            {...register('username')}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">Mot de passe</label>
          <input
            type="password"
            {...register('password')}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-zinc-900 text-white text-sm font-medium py-2.5 hover:bg-zinc-800 disabled:opacity-50"
        >
          {isSubmitting ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Verify it builds**

Run: `cd apps/dashboard && npm run build`
Expected: build succeeds, `/login` listed as a route.

- [ ] **Step 7: Commit**

```bash
git add apps/dashboard/src/lib/api apps/dashboard/src/providers apps/dashboard/src/app/layout.tsx "apps/dashboard/src/app/(auth)"
git commit -m "feat(dashboard): add API client, auth provider and login page"
```

---

### Task 6: Dashboard shell — sidebar + layout

**Files:**
- Create: `apps/dashboard/src/components/ui/kpi-card.tsx`
- Create: `apps/dashboard/src/components/layout/sidebar.tsx`
- Create: `apps/dashboard/src/app/(dashboard)/dashboard/layout.tsx`

- [ ] **Step 1: KPI card (mirrors the reference project's `components/ui/kpi-card.tsx`)**

Create `apps/dashboard/src/components/ui/kpi-card.tsx`:

```tsx
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type KpiCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
};

export function KpiCard({ label, value, icon: Icon, iconColor = 'text-blue-600' }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className={cn('p-2.5 rounded-lg bg-slate-50', iconColor)}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse" />
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
        <div className="h-7 w-16 rounded bg-slate-200 animate-pulse" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Sidebar (mirrors the reference's `admin-nav.tsx` visual language, simplified — single DIRECTION nav, no collapsible submenus needed)**

Create `apps/dashboard/src/components/layout/sidebar.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardX, GraduationCap, LayoutDashboard, LogOut, UserCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

const NAV_LINKS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Classes', href: '/dashboard/classes', icon: GraduationCap },
  { label: 'Personnel', href: '/dashboard/personnel', icon: Users },
  { label: 'Absences', href: '/dashboard/absences', icon: ClipboardX },
  { label: 'Profil', href: '/dashboard/profil', icon: UserCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const initials = (session?.username ?? '??').slice(0, 2).toUpperCase();

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 z-50 flex flex-col bg-white border-r border-zinc-100 shadow-[2px_0_24px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-200 flex-shrink-0">
          <span className="text-xs font-bold text-white tracking-tight">PS</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-zinc-900 leading-tight truncate tracking-tight">Présence Scolaire</p>
          <span className="inline-block text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full leading-none mt-0.5">
            Direction
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {NAV_LINKS.map(({ label, href, icon: Icon }) => {
          const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[13px] font-medium transition-all duration-150',
                active ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900',
              )}
            >
              <Icon size={15} className={cn('flex-shrink-0', active ? 'text-emerald-400' : 'text-zinc-400')} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-3 border-t border-zinc-100 pt-2.5">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-white">
            <span className="text-[10px] font-bold text-white">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-zinc-700 truncate leading-tight">{session?.username}</p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            title="Déconnexion"
            className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Dashboard section layout**

Create `apps/dashboard/src/app/(dashboard)/dashboard/layout.tsx`:

```tsx
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="ml-60 p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Verify it builds**

Run: `cd apps/dashboard && npm run build`
Expected: build succeeds (no page under `(dashboard)/dashboard` yet, so no new route appears — that's fine, added in Task 7).

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/components "apps/dashboard/src/app/(dashboard)"
git commit -m "feat(dashboard): add sidebar and dashboard section layout"
```

---

### Task 7: Dashboard overview page (KPIs, trend, class comparison, alerts, live stream)

**Files:**
- Create: `apps/dashboard/src/types/dashboard.ts`
- Create: `apps/dashboard/src/lib/api/dashboard.ts`
- Create: `apps/dashboard/src/lib/hooks/useDashboard.ts`
- Create: `apps/dashboard/src/lib/realtime/useDashboardStream.ts`
- Create: `apps/dashboard/src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Types**

Create `apps/dashboard/src/types/dashboard.ts`:

```ts
export type DashboardOverview = {
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  rate: number;
};

export type TrendPoint = { date: string; rate: number };

export type ClassComparison = {
  schoolClassId: string;
  name: string;
  totalStudents: number;
  presentCount: number;
  rate: number;
};

export type UnjustifiedAbsence = { absenceId: string; date: string; studentId: string; firstName: string; lastName: string };
export type RepeatedLateness = { studentId: string; firstName: string; lastName: string; lateCount: number };
export type DashboardAlerts = { unjustifiedAbsences: UnjustifiedAbsence[]; repeatedLateness: RepeatedLateness[] };
```

- [ ] **Step 2: API wrapper**

Create `apps/dashboard/src/lib/api/dashboard.ts`:

```ts
import { apiClient } from '@/lib/api/client';
import type { ClassComparison, DashboardAlerts, DashboardOverview, TrendPoint } from '@/types/dashboard';

export const dashboardApi = {
  getOverview: async () => (await apiClient.get<DashboardOverview>('/dashboard/overview')).data,
  getTrend: async (period: 'week' | 'month') =>
    (await apiClient.get<TrendPoint[]>('/dashboard/trend', { params: { period } })).data,
  getClassesComparison: async () => (await apiClient.get<ClassComparison[]>('/dashboard/classes-comparison')).data,
  getAlerts: async () => (await apiClient.get<DashboardAlerts>('/dashboard/alerts')).data,
};
```

- [ ] **Step 3: React Query hooks**

Create `apps/dashboard/src/lib/hooks/useDashboard.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboard';

export function useOverview() {
  return useQuery({ queryKey: ['dashboard', 'overview'], queryFn: dashboardApi.getOverview, refetchInterval: 30_000 });
}

export function useTrend(period: 'week' | 'month') {
  return useQuery({ queryKey: ['dashboard', 'trend', period], queryFn: () => dashboardApi.getTrend(period) });
}

export function useClassesComparison() {
  return useQuery({
    queryKey: ['dashboard', 'classes-comparison'],
    queryFn: dashboardApi.getClassesComparison,
    refetchInterval: 30_000,
  });
}

export function useAlerts() {
  return useQuery({ queryKey: ['dashboard', 'alerts'], queryFn: dashboardApi.getAlerts, refetchInterval: 30_000 });
}
```

- [ ] **Step 4: Live stream hook**

Remember (see "Before you start"): backend SSE events carry `type: 'attendance.recorded' | 'absence.marked'`, which the browser only receives via named listeners, not `onmessage`.

Create `apps/dashboard/src/lib/realtime/useDashboardStream.ts`:

```ts
'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export type StreamStatus = 'connecting' | 'live' | 'offline';

const STREAM_EVENT_TYPES = ['attendance.recorded', 'absence.marked'] as const;

export function useDashboardStream(): StreamStatus {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StreamStatus>('connecting');

  useEffect(() => {
    const source = new EventSource('/api/dashboard/stream');
    const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['dashboard'] });

    source.onopen = () => setStatus('live');
    source.onerror = () => setStatus('offline');
    for (const eventType of STREAM_EVENT_TYPES) {
      source.addEventListener(eventType, invalidate);
    }

    return () => source.close();
  }, [queryClient]);

  return status;
}
```

- [ ] **Step 5: Overview page**

Create `apps/dashboard/src/app/(dashboard)/dashboard/page.tsx`:

```tsx
'use client';

import { CheckCircle2, Clock, Users, XCircle } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { KpiCard, KpiCardSkeleton } from '@/components/ui/kpi-card';
import { useAlerts, useClassesComparison, useOverview, useTrend } from '@/lib/hooks/useDashboard';
import { useDashboardStream } from '@/lib/realtime/useDashboardStream';

export default function DashboardOverviewPage() {
  const status = useDashboardStream();
  const overview = useOverview();
  const trend = useTrend('week');
  const classes = useClassesComparison();
  const alerts = useAlerts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Vue d&apos;ensemble</h1>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            status === 'live' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'
          }`}
        >
          {status === 'live' ? 'Temps réel actif' : status === 'connecting' ? 'Connexion...' : 'Hors ligne'}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {overview.isLoading ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard label="Élèves inscrits" value={overview.data?.totalStudents ?? 0} icon={Users} iconColor="text-blue-600" />
            <KpiCard label="Présents" value={overview.data?.presentCount ?? 0} icon={CheckCircle2} iconColor="text-emerald-600" />
            <KpiCard label="En retard" value={overview.data?.lateCount ?? 0} icon={Clock} iconColor="text-amber-600" />
            <KpiCard label="Absents" value={overview.data?.absentCount ?? 0} icon={XCircle} iconColor="text-red-600" />
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-zinc-700 mb-4">Taux de présence — 7 derniers jours</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trend.data ?? []}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-zinc-700 mb-4">Comparaison des classes</h2>
          <div className="space-y-2">
            {(classes.data ?? []).map((c) => (
              <div key={c.schoolClassId} className="flex items-center justify-between text-sm">
                <span className="text-zinc-700">{c.name}</span>
                <span className="text-zinc-500">
                  {c.presentCount}/{c.totalStudents} ({c.rate}%)
                </span>
              </div>
            ))}
            {classes.data?.length === 0 && <p className="text-sm text-zinc-400">Aucune classe.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-zinc-700 mb-4">Alertes</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1">Absences non justifiées</p>
              {(alerts.data?.unjustifiedAbsences ?? []).slice(0, 5).map((a) => (
                <p key={a.absenceId} className="text-sm text-zinc-700">
                  {a.firstName} {a.lastName} — {a.date}
                </p>
              ))}
              {alerts.data?.unjustifiedAbsences.length === 0 && <p className="text-sm text-zinc-400">Aucune.</p>}
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1">Retards répétés</p>
              {(alerts.data?.repeatedLateness ?? []).slice(0, 5).map((s) => (
                <p key={s.studentId} className="text-sm text-zinc-700">
                  {s.firstName} {s.lastName} — {s.lateCount} retards
                </p>
              ))}
              {alerts.data?.repeatedLateness.length === 0 && <p className="text-sm text-zinc-400">Aucun.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify it builds**

Run: `cd apps/dashboard && npm run build`
Expected: build succeeds, `/dashboard` listed as a route.

- [ ] **Step 7: Commit**

```bash
git add apps/dashboard/src/types/dashboard.ts apps/dashboard/src/lib/api/dashboard.ts apps/dashboard/src/lib/hooks/useDashboard.ts apps/dashboard/src/lib/realtime "apps/dashboard/src/app/(dashboard)/dashboard/page.tsx"
git commit -m "feat(dashboard): add overview page with KPIs, trend, alerts and live stream"
```

---

### Task 8: Personnel page (staff accounts)

**Files:**
- Create: `apps/dashboard/src/types/staff.ts`
- Create: `apps/dashboard/src/lib/api/staff.ts`
- Create: `apps/dashboard/src/lib/hooks/useStaff.ts`
- Create: `apps/dashboard/src/app/(dashboard)/dashboard/personnel/page.tsx`

- [ ] **Step 1: Types**

Create `apps/dashboard/src/types/staff.ts`:

```ts
export type StaffAccount = {
  id: string;
  username: string;
  role: 'ENSEIGNANT' | 'SURVEILLANT';
  disabledAt: string | null;
  assignedClasses: { id: string; name: string }[];
};

export type ProvisionedStaffAccount = { username: string; password: string };
```

- [ ] **Step 2: API wrapper**

Create `apps/dashboard/src/lib/api/staff.ts`:

```ts
import { apiClient } from '@/lib/api/client';
import type { ProvisionedStaffAccount, StaffAccount } from '@/types/staff';

export const staffApi = {
  list: async () => (await apiClient.get<StaffAccount[]>('/staff')).data,
  create: async (input: { role: 'ENSEIGNANT' | 'SURVEILLANT'; firstName: string; lastName: string }) =>
    (await apiClient.post<ProvisionedStaffAccount>('/staff', input)).data,
  disable: async (userId: string) => (await apiClient.patch(`/staff/${userId}/disable`)).data,
};
```

- [ ] **Step 3: React Query hooks**

Create `apps/dashboard/src/lib/hooks/useStaff.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { staffApi } from '@/lib/api/staff';

export function useStaff() {
  return useQuery({ queryKey: ['staff'], queryFn: staffApi.list });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: staffApi.create,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useDisableStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: staffApi.disable,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['staff'] }),
  });
}
```

- [ ] **Step 4: Page**

Create `apps/dashboard/src/app/(dashboard)/dashboard/personnel/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateStaff, useDisableStaff, useStaff } from '@/lib/hooks/useStaff';

const staffSchema = z.object({
  role: z.enum(['ENSEIGNANT', 'SURVEILLANT']),
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
});
type StaffForm = z.infer<typeof staffSchema>;

export default function PersonnelPage() {
  const staff = useStaff();
  const createStaff = useCreateStaff();
  const disableStaff = useDisableStaff();
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null);
  const { register, handleSubmit, reset } = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: { role: 'ENSEIGNANT' },
  });

  async function onSubmit(values: StaffForm) {
    const result = await createStaff.mutateAsync(values);
    setCreatedCredentials(result);
    reset();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">Personnel</h1>

      {createdCredentials && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
          Compte créé — identifiant <strong>{createdCredentials.username}</strong>, mot de passe{' '}
          <strong>{createdCredentials.password}</strong>. Note-le maintenant : il ne sera plus jamais affiché.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex gap-3 items-end">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Rôle</label>
          <select {...register('role')} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">
            <option value="ENSEIGNANT">Enseignant</option>
            <option value="SURVEILLANT">Surveillant</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Prénom</label>
          <input {...register('firstName')} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Nom</label>
          <input {...register('lastName')} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-800">
          Créer le compte
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {(staff.data ?? []).map((account) => (
          <div key={account.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900">{account.username}</p>
              <p className="text-xs text-zinc-500">
                {account.role === 'ENSEIGNANT' ? 'Enseignant' : 'Surveillant'}
                {account.disabledAt ? ' — désactivé' : ''}
              </p>
            </div>
            {!account.disabledAt && (
              <button
                type="button"
                onClick={() => disableStaff.mutate(account.id)}
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                Désactiver
              </button>
            )}
          </div>
        ))}
        {staff.data?.length === 0 && <p className="p-4 text-sm text-zinc-400">Aucun compte.</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify it builds**

Run: `cd apps/dashboard && npm run build`
Expected: build succeeds, `/dashboard/personnel` listed as a route.

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/src/types/staff.ts apps/dashboard/src/lib/api/staff.ts apps/dashboard/src/lib/hooks/useStaff.ts "apps/dashboard/src/app/(dashboard)/dashboard/personnel"
git commit -m "feat(dashboard): add personnel page (provision/list/disable staff accounts)"
```

---

### Task 9: Classes page (CRUD + teacher assignment)

Depends on Task 8's `useStaff` hook (assignment dropdown lists staff accounts).

**Files:**
- Create: `apps/dashboard/src/types/classes.ts`
- Create: `apps/dashboard/src/lib/api/classes.ts`
- Create: `apps/dashboard/src/lib/hooks/useClasses.ts`
- Create: `apps/dashboard/src/app/(dashboard)/dashboard/classes/page.tsx`

- [ ] **Step 1: Types**

Create `apps/dashboard/src/types/classes.ts`:

```ts
export type SchoolClass = {
  id: string;
  name: string;
  promotion: string;
  assignedTeachers: { id: string; username: string }[];
};
```

- [ ] **Step 2: API wrapper**

Create `apps/dashboard/src/lib/api/classes.ts`:

```ts
import { apiClient } from '@/lib/api/client';
import type { SchoolClass } from '@/types/classes';

export const classesApi = {
  list: async () => (await apiClient.get<SchoolClass[]>('/classes')).data,
  create: async (input: { name: string; promotion: string }) => (await apiClient.post<SchoolClass>('/classes', input)).data,
  update: async (id: string, input: { name?: string; promotion?: string }) =>
    (await apiClient.patch<SchoolClass>(`/classes/${id}`, input)).data,
  remove: async (id: string) => (await apiClient.delete(`/classes/${id}`)).data,
  assignTeacher: async (classId: string, userId: string) => (await apiClient.post(`/classes/${classId}/teachers/${userId}`)).data,
  unassignTeacher: async (classId: string, userId: string) => (await apiClient.delete(`/classes/${classId}/teachers/${userId}`)).data,
};
```

- [ ] **Step 3: React Query hooks**

Create `apps/dashboard/src/lib/hooks/useClasses.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { classesApi } from '@/lib/api/classes';

export function useClasses() {
  return useQuery({ queryKey: ['classes'], queryFn: classesApi.list });
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: classesApi.create,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });
}

export function useAssignTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, userId }: { classId: string; userId: string }) => classesApi.assignTeacher(classId, userId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });
}

export function useUnassignTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, userId }: { classId: string; userId: string }) => classesApi.unassignTeacher(classId, userId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });
}
```

- [ ] **Step 4: Page**

Create `apps/dashboard/src/app/(dashboard)/dashboard/classes/page.tsx`:

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAssignTeacher, useClasses, useCreateClass, useUnassignTeacher } from '@/lib/hooks/useClasses';
import { useStaff } from '@/lib/hooks/useStaff';

const classSchema = z.object({ name: z.string().min(1, 'Nom requis'), promotion: z.string().min(1, 'Promotion requise') });
type ClassForm = z.infer<typeof classSchema>;

export default function ClassesPage() {
  const classes = useClasses();
  const staff = useStaff();
  const createClass = useCreateClass();
  const assignTeacher = useAssignTeacher();
  const unassignTeacher = useUnassignTeacher();
  const { register, handleSubmit, reset } = useForm<ClassForm>({ resolver: zodResolver(classSchema) });

  async function onSubmit(values: ClassForm) {
    await createClass.mutateAsync(values);
    reset();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">Classes</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex gap-3 items-end">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Nom</label>
          <input {...register('name')} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm" placeholder="6e A" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Promotion</label>
          <input {...register('promotion')} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm" placeholder="2026" />
        </div>
        <button type="submit" className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-800">
          Créer
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {(classes.data ?? []).map((schoolClass) => (
          <div key={schoolClass.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900">{schoolClass.name}</p>
              <p className="text-xs text-zinc-500">{schoolClass.promotion}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {schoolClass.assignedTeachers.map((teacher) => (
                  <span key={teacher.id} className="inline-flex items-center gap-1 text-xs bg-zinc-100 text-zinc-700 rounded-full px-2 py-0.5">
                    {teacher.username}
                    <button
                      type="button"
                      onClick={() => unassignTeacher.mutate({ classId: schoolClass.id, userId: teacher.id })}
                      className="text-zinc-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) assignTeacher.mutate({ classId: schoolClass.id, userId: e.target.value });
                e.target.value = '';
              }}
              className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5"
            >
              <option value="" disabled>
                + Assigner un enseignant
              </option>
              {(staff.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.username}
                </option>
              ))}
            </select>
          </div>
        ))}
        {classes.data?.length === 0 && <p className="p-4 text-sm text-zinc-400">Aucune classe.</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify it builds**

Run: `cd apps/dashboard && npm run build`
Expected: build succeeds, `/dashboard/classes` listed as a route.

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/src/types/classes.ts apps/dashboard/src/lib/api/classes.ts apps/dashboard/src/lib/hooks/useClasses.ts "apps/dashboard/src/app/(dashboard)/dashboard/classes"
git commit -m "feat(dashboard): add classes page (CRUD + teacher assignment)"
```

---

### Task 10: Absences page (list + justify)

**Files:**
- Create: `apps/dashboard/src/types/absences.ts`
- Create: `apps/dashboard/src/lib/api/absences.ts`
- Create: `apps/dashboard/src/lib/hooks/useAbsences.ts`
- Create: `apps/dashboard/src/app/(dashboard)/dashboard/absences/page.tsx`

- [ ] **Step 1: Types**

Create `apps/dashboard/src/types/absences.ts`:

```ts
export type Absence = {
  id: string;
  date: string;
  justified: boolean;
  justificationReason: string | null;
  student: { id: string; firstName: string; lastName: string; schoolClassId: string };
};
```

- [ ] **Step 2: API wrapper**

Create `apps/dashboard/src/lib/api/absences.ts`:

```ts
import { apiClient } from '@/lib/api/client';
import type { Absence } from '@/types/absences';

export const absencesApi = {
  list: async () => (await apiClient.get<Absence[]>('/absences')).data,
  justify: async (id: string, reason: string) => (await apiClient.patch<Absence>(`/absences/${id}/justify`, { reason })).data,
};
```

- [ ] **Step 3: React Query hooks**

Create `apps/dashboard/src/lib/hooks/useAbsences.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { absencesApi } from '@/lib/api/absences';

export function useAbsences() {
  return useQuery({ queryKey: ['absences'], queryFn: absencesApi.list });
}

export function useJustifyAbsence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => absencesApi.justify(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['absences'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'alerts'] });
    },
  });
}
```

- [ ] **Step 4: Page**

Create `apps/dashboard/src/app/(dashboard)/dashboard/absences/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useAbsences, useJustifyAbsence } from '@/lib/hooks/useAbsences';

export default function AbsencesPage() {
  const absences = useAbsences();
  const justify = useJustifyAbsence();
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">Absences</h1>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {(absences.data ?? []).map((absence) => (
          <div key={absence.id} className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                {absence.student.firstName} {absence.student.lastName}
              </p>
              <p className="text-xs text-zinc-500">
                {absence.date}
                {absence.justified ? ` — justifiée (${absence.justificationReason})` : ' — non justifiée'}
              </p>
            </div>
            {!absence.justified && (
              <div className="flex gap-2">
                <input
                  value={reasonDrafts[absence.id] ?? ''}
                  onChange={(e) => setReasonDrafts((prev) => ({ ...prev, [absence.id]: e.target.value }))}
                  placeholder="Motif"
                  className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5"
                />
                <button
                  type="button"
                  onClick={() => justify.mutate({ id: absence.id, reason: reasonDrafts[absence.id] ?? '' })}
                  disabled={!reasonDrafts[absence.id]}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-40"
                >
                  Justifier
                </button>
              </div>
            )}
          </div>
        ))}
        {absences.data?.length === 0 && <p className="p-4 text-sm text-zinc-400">Aucune absence.</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify it builds**

Run: `cd apps/dashboard && npm run build`
Expected: build succeeds, `/dashboard/absences` listed as a route.

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/src/types/absences.ts apps/dashboard/src/lib/api/absences.ts apps/dashboard/src/lib/hooks/useAbsences.ts "apps/dashboard/src/app/(dashboard)/dashboard/absences"
git commit -m "feat(dashboard): add absences page (list + justify)"
```

---

### Task 11: Profil page

**Files:**
- Create: `apps/dashboard/src/app/(dashboard)/dashboard/profil/page.tsx`

- [ ] **Step 1: Page**

Create `apps/dashboard/src/app/(dashboard)/dashboard/profil/page.tsx`:

```tsx
'use client';

import { useAuth } from '@/providers/auth-provider';

export default function ProfilPage() {
  const { session } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">Profil</h1>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 max-w-sm">
        <p className="text-sm text-zinc-500">Identifiant</p>
        <p className="text-sm font-semibold text-zinc-900">{session?.username}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds, and run the full test suite one last time**

Run: `cd apps/dashboard && npm run build`
Expected: build succeeds, `/dashboard/profil` listed as a route, along with every other route from Tasks 5–10.

Run: `cd apps/dashboard && npm test`
Expected: all suites pass (`utils.test.ts`, `decode-access-token.test.ts`).

- [ ] **Step 3: Commit**

```bash
git add "apps/dashboard/src/app/(dashboard)/dashboard/profil"
git commit -m "feat(dashboard): add profil page"
```

---

### Task 12: Manual end-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Start both backend and dashboard**

Terminal 1: `docker compose -f docker-compose.yml up -d` (from repo root), then `cd apps/backend && npm run start:dev`
Terminal 2: `cd apps/dashboard && cp .env.example .env.local && npm run dev`

- [ ] **Step 2: Log in**

Open `http://localhost:3001` in a browser. Expect a redirect to `/login`. Log in with the seeded `direction1` / `changeme123` (see `apps/backend/README.md`). Expect a redirect to `/dashboard`.

- [ ] **Step 3: Walk through each page**

- `/dashboard`: KPI cards render with real numbers (0s on a fresh seed is fine), trend chart renders, "Temps réel actif" badge appears within a couple seconds.
- `/dashboard/classes`: create a class, assign a staff account to it (needs at least one created in the next step first — come back to this after Step 4), unassign it, confirm the list updates without a manual refresh.
- `/dashboard/personnel`: create an ENSEIGNANT account, confirm the one-time username/password banner appears, confirm the account shows in the list, disable it, confirm the "désactivé" label appears and that account can no longer log in (`POST /auth/login` for it returns 401).
- `/dashboard/absences`: initially empty on a fresh seed (no absence job has run yet) — acceptable, just confirm the empty state renders without error.
- `/dashboard/profil`: shows the logged-in username.
- Log out from the sidebar: confirm redirect to `/login` and that `/dashboard` is no longer reachable without logging in again.

- [ ] **Step 4: Verify live updates**

With `/dashboard` open in one browser tab, trigger an attendance push from the mobile app (or replay a sync push as it would). Confirm the KPI cards and "Derniers scans"-equivalent data update within the 30s poll window, and ideally instantly via the SSE badge staying "Temps réel actif" (check the browser Network tab shows an open `EventSource` connection to `/api/dashboard/stream`).

- [ ] **Step 5: Report back**

Confirm all of the above worked, or note which step failed.

---

## Plan self-review notes

- **Spec coverage:** §5.1 (design system) → Task 6. §5.2 (auth) → Tasks 2–4. §5.3 (pages) → Tasks 5, 7–11. SSE `type` vs `event:` gotcha called out explicitly in "Before you start" and Task 7 so it isn't silently missed.
- **No placeholders:** every step shows complete, concrete code.
- **Type consistency checked:** `AuthSession` shape (`userId`/`username`/`role`/`schoolId`) matches between `types/auth.ts`, `decode-access-token.ts`, `session/route.ts`, and `auth-provider.tsx`. `dashboardApi`/`classesApi`/`staffApi`/`absencesApi` method names match their corresponding hook `mutationFn`/`queryFn` usages and the page components that call the hooks.
- **Scope check:** DIRECTION role only, no student/parent pages, no PDF/report export, no multi-school switcher — all explicitly out of scope per the spec and confirmed with the user during brainstorming.
