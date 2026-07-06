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

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await login(credentials);
      await saveAuthTokens(response.accessToken, response.refreshToken);
      return response;
    },
  });
}
