import type { UserRole } from '@/api/hooks/useLogin';

export type AppDestination =
  | '/(teacher)/dashboard'
  | '/(parent)/children'
  | '/(student)/scan'
  | '/(direction)/eleves'
  | '/changer-mot-de-passe';

/** Where to land a user right after a successful login, based on their role. */
export function initialRouteForRole(
  role: UserRole,
): '/(teacher)/dashboard' | '/(parent)/children' | '/(student)/scan' | '/(direction)/eleves' {
  switch (role) {
    case 'ENSEIGNANT':
    case 'SURVEILLANT':
      return '/(teacher)/dashboard';
    case 'PARENT':
      return '/(parent)/children';
    case 'ELEVE':
      return '/(student)/scan';
    case 'DIRECTION':
      return '/(direction)/eleves';
    case 'ADMIN':
      // Pas d'écran mobile dédié en v1 pour ADMIN — renvoyé en lecture vers
      // le stack enseignant, à affiner plus tard.
      return '/(teacher)/dashboard';
  }
}

/**
 * Point d'entrée unique après login (ou reprise de session) — un compte
 * ELEVE/PARENT tout juste provisionné (mot de passe généré, cf.
 * User.mustChangePassword côté backend) est toujours renvoyé vers l'écran
 * de changement forcé, quel que soit son rôle, avant de voir quoi que ce
 * soit d'autre.
 */
export function resolveDestination(user: { role: UserRole; mustChangePassword: boolean }): AppDestination {
  if (user.mustChangePassword) return '/changer-mot-de-passe';
  return initialRouteForRole(user.role);
}
