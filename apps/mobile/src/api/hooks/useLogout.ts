import { router } from 'expo-router';

import { queryClient } from '@/api/client';
import { clearAuthTokens } from '@/services/secureStorage';

/** Déconnexion : purge tokens + cache react-query, retour au login. */
export function useLogout(): () => Promise<void> {
  return async function logout() {
    await clearAuthTokens();
    queryClient.clear();
    router.replace('/(auth)/login');
  };
}
