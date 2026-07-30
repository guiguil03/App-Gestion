import * as Sentry from '@sentry/nestjs';

// Doit être importé avant tout autre module (voir main.ts) — un DSN absent
// désactive silencieusement le SDK (aucun compte Sentry créé pour l'instant,
// voir SENTRY_DSN dans .env.example).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  tracesSampleRate: 0.1,
});
