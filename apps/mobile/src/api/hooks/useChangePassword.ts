import { isAxiosError } from 'axios';
import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import type { LoginResponse } from '@/api/hooks/useLogin';
import { saveAuthTokens } from '@/services/secureStorage';

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

async function changePassword(payload: ChangePasswordPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/change-password', payload);
  return data;
}

export function getChangePasswordErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.status === 400) {
    return 'Mot de passe actuel incorrect.';
  }
  return 'Une erreur est survenue. Réessaie.';
}

/** Réémet une paire de jetons à jour (mustChangePassword: false) — sauvegardée directement, pas besoin de repasser par un login. */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      const response = await changePassword(payload);
      await saveAuthTokens(response.accessToken, response.refreshToken);
      return response;
    },
  });
}
