import { isAxiosError } from 'axios';
import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import { saveAuthTokens } from '@/services/secureStorage';

export type UserRole = 'ADMIN' | 'DIRECTION' | 'ENSEIGNANT' | 'SURVEILLANT' | 'PARENT';

export type LoginCredentials = {
  username: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
  schoolId: string | null;
};

async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials);
  return data;
}

/**
 * Distingue "identifiants faux" (401 du backend) d'une vraie panne réseau
 * (backend injoignable, mauvaise EXPO_PUBLIC_API_URL, CORS...) — sans ça,
 * ces deux cas très différents affichaient le même message trompeur.
 */
export function getLoginErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 401) {
      return 'Identifiant ou mot de passe incorrect.';
    }
    if (!error.response) {
      return "Impossible de joindre le serveur. Vérifie que le backend tourne et que l'adresse API (EXPO_PUBLIC_API_URL) est correcte.";
    }
  }
  return 'Une erreur est survenue. Réessayez.';
}

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await login(credentials);
      await saveAuthTokens(response.accessToken, response.refreshToken);
      return response;
    },
  });
}
