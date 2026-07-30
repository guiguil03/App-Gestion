const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {};

// org/project : identifiants stables du projet Sentry (pas des secrets, donc
// en dur comme le fait l'assistant d'installation officiel). Sans
// SENTRY_AUTH_TOKEN (à générer sur sentry.io/settings/account/api/auth-tokens,
// scope project:releases), l'upload des source maps est simplement ignoré au
// build — le wrapper reste inerte.
module.exports = withSentryConfig(nextConfig, {
  org: 'guigui-3o',
  project: 'presenceconnect',

  // N'affiche les logs d'upload des source maps qu'en CI.
  silent: !process.env.CI,

  // Upload un ensemble plus large de source maps pour des stack traces plus lisibles.
  widenClientFileUpload: true,

  // Fait passer les requêtes du navigateur vers Sentry par un rewrite Next.js
  // pour contourner les ad-blockers.
  tunnelRoute: '/monitoring',

  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
