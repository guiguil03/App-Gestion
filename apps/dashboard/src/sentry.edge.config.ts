import * as Sentry from '@sentry/nextjs';

// Runtime edge (middleware.ts) — même config que sentry.server.config.ts,
// séparée car Next.js charge les deux runtimes indépendamment.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
