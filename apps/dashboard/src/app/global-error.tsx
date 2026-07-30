'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';

// Filet de sécurité pour les erreurs de rendu React non rattrapées par une
// error.tsx locale — remonte à Sentry (no-op si SENTRY_DSN absent) avant
// d'afficher la page d'erreur générique de Next.js.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
