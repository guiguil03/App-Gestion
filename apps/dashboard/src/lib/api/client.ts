import axios, { AxiosError } from 'axios';

export const apiClient = axios.create({ baseURL: '/api', withCredentials: true });

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then((res) => res.ok)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    // Les routes /auth/* (login, logout, session, refresh) ne doivent jamais
    // déclencher ce flux : un 401 sur /auth/session signifie simplement
    // "pas encore connecté", pas "session expirée en cours d'usage". Sans
    // cette exclusion, la vérification de session sur /login déclenchait
    // elle-même une tentative de refresh (échoue, pas de cookie) puis une
    // redirection vers /login — provoquant une boucle de rechargement infinie.
    const isAuthEndpoint = originalRequest?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && originalRequest && !originalRequest._retried && !isAuthEndpoint) {
      originalRequest._retried = true;
      const refreshed = await refreshSession();
      if (refreshed) {
        return apiClient(originalRequest);
      }
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
