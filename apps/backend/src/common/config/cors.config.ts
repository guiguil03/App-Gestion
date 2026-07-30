import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const DEFAULT_DEV_ORIGINS = ['http://localhost:3001', 'http://localhost:3000'];

/**
 * Origines autorisées à appeler l'API depuis un navigateur. Note : ni le
 * proxy Next.js (apps/dashboard/src/app/api/[...path]/route.ts, un fetch()
 * serveur-à-serveur) ni l'app mobile (client natif) ne sont soumis au CORS —
 * seul un appel direct depuis du JS de navigateur envoie un en-tête Origin,
 * donc cette liste ne gêne ni le dashboard ni le mobile, elle empêche
 * seulement un site tiers d'appeler l'API directement depuis le navigateur
 * d'un visiteur.
 */
function allowedOrigins(): string[] {
  const fromEnv = process.env.CORS_ALLOWED_ORIGINS;
  if (fromEnv) {
    return fromEnv.split(',').map((origin) => origin.trim()).filter(Boolean);
  }
  return DEFAULT_DEV_ORIGINS;
}

export function corsOptions(): CorsOptions {
  const allowed = allowedOrigins();
  return {
    origin: (requestOrigin, callback) => {
      // Pas d'en-tête Origin (requête serveur-à-serveur, client natif, curl) :
      // jamais un scénario CORS — toujours autorisé.
      if (!requestOrigin) return callback(null, true);
      callback(null, allowed.includes(requestOrigin));
    },
  };
}
