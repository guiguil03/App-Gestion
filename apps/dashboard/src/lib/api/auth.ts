import { apiClient } from '@/lib/api/client';
import type { AuthSession } from '@/types/auth';

export const authApi = {
  login: async (username: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { username, password });
    return data;
  },
  logout: () => apiClient.post('/auth/logout'),
  session: async () => {
    const { data } = await apiClient.get<{ authenticated: boolean; session?: AuthSession }>('/auth/session');
    return data;
  },
};
