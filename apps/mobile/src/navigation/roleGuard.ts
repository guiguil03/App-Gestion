import type { UserRole } from '@/api/hooks/useLogin';

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
