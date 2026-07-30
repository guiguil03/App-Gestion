import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

type Window = { count: number; windowStart: number };

/**
 * Protection anti-bruteforce sur /auth/login, indexée par identifiant plutôt
 * que par IP : tout le trafic du dashboard passe par un unique proxy
 * Next.js (apps/dashboard/src/app/api/[...path]/route.ts, fetch()
 * serveur-à-serveur), donc côté backend chaque requête dashboard semble
 * venir de la même IP — un throttle par IP bloquerait tous les comptes de
 * direction d'un coup dès qu'un seul échoue plusieurs fois. Par identifiant,
 * la protection reste correcte quel que soit le chemin réseau (dashboard,
 * mobile, appel direct).
 *
 * État en mémoire (pas de Redis) : suffisant pour une instance backend
 * unique (déploiement actuel) ; à migrer vers un store partagé si le backend
 * est un jour dupliqué horizontalement.
 */
@Injectable()
export class LoginThrottleService {
  private readonly attempts = new Map<string, Window>();

  assertNotLocked(username: string): void {
    const entry = this.attempts.get(username);
    if (!entry) return;

    if (Date.now() - entry.windowStart > WINDOW_MS) {
      this.attempts.delete(username);
      return;
    }

    if (entry.count >= MAX_ATTEMPTS) {
      throw new HttpException('Trop de tentatives de connexion. Réessayez dans quelques minutes.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  registerFailure(username: string): void {
    const entry = this.attempts.get(username);
    const now = Date.now();

    if (!entry || now - entry.windowStart > WINDOW_MS) {
      this.attempts.set(username, { count: 1, windowStart: now });
      return;
    }

    entry.count += 1;
  }

  reset(username: string): void {
    this.attempts.delete(username);
  }
}
