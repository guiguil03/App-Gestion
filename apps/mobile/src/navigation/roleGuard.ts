import type { UserRole } from '@/api/hooks/useLogin';

/** Where to land a user right after a successful login, based on their role. */
export function initialRouteForRole(role: UserRole): '/(teacher)/scan' | '/(parent)/children' {
  switch (role) {
    case 'ENSEIGNANT':
    case 'SURVEILLANT':
      return '/(teacher)/scan';
    case 'PARENT':
      return '/(parent)/children';
    case 'DIRECTION':
    case 'ADMIN':
      // Pas d'écran mobile dédié en v1 : ces rôles utilisent le dashboard web.
      // On les renvoie vers le stack enseignant en lecture, à affiner plus tard.
      return '/(teacher)/scan';
  }
}
