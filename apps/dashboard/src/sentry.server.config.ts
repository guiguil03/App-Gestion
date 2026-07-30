import * as Sentry from '@sentry/nextjs';

// DSN absent = SDK désactivé silencieusement (aucun compte Sentry créé pour
// l'instant, voir SENTRY_DSN dans .env.example).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
