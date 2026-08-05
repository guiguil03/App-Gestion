import { InternalServerErrorException } from '@nestjs/common';

// `RAILWAY_PUBLIC_DOMAIN` est injectée automatiquement par Railway pour tout
// service exposant un domaine public — pas besoin de la dupliquer à la main
// dans les variables d'env. `PUBLIC_BACKEND_URL` reste un override pour le
// dev local (Railway absent) ou un domaine custom.
function publicBackendOrigin(): string {
  const override = process.env.PUBLIC_BACKEND_URL;
  if (override) return override.replace(/\/$/, '');

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (railwayDomain) return `https://${railwayDomain}`;

  throw new InternalServerErrorException(
    'Impossible de construire une URL de média publique : PUBLIC_BACKEND_URL ou RAILWAY_PUBLIC_DOMAIN requis',
  );
}

export function publicMediaUrl(namespace: string, filename: string): string {
  return `${publicBackendOrigin()}/media/${namespace}/${filename}`;
}
