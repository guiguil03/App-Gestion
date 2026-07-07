import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { QueryClient } from '@tanstack/react-query';

import { clearAuthTokens, getAccessToken, getRefreshToken, saveAuthTokens } from '@/services/secureStorage';

// Overridden per environment (dev/staging/prod) via EXPO_PUBLIC_API_URL.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Requêtes qui ne doivent jamais déclencher de refresh (sinon boucle infinie
// ou tentative de refresh avant même d'avoir un token).
const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh'];

// Partagée entre requêtes concurrentes : si deux appels prennent un 401 en
// même temps (ex. pull + push du sync), un seul appel à /auth/refresh part,
// les deux attendent le même résultat.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error('Pas de refresh token disponible');
  }
  // axios "nu" (pas apiClient) : évite de repasser par l'intercepteur de
  // requête/réponse ci-dessus pour cet appel.
  const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
  );
  await saveAuthTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;
    const url = originalRequest?.url ?? '';

    const shouldAttemptRefresh =
      status === 401 && originalRequest && !originalRequest._retry && !AUTH_ENDPOINTS.some((path) => url.includes(path));

    if (!shouldAttemptRefresh) {
      throw error;
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient.request(originalRequest);
    } catch (refreshError) {
      await clearAuthTokens();
      throw refreshError;
    }
  },
);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60_000,
    },
  },
});
