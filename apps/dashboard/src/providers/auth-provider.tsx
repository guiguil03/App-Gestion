'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import type { AuthSession } from '@/types/auth';

type AuthContextValue = {
  session: AuthSession | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authApi
      .session()
      .then((data) => setSession(data.authenticated ? (data.session ?? null) : null))
      .catch(() => setSession(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      await authApi.login(username, password);
      const data = await authApi.session();
      setSession(data.session ?? null);
      router.push(data.session?.role === 'ADMIN' ? '/admin' : '/dashboard');
    },
    [router],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setSession(null);
    router.push('/login');
  }, [router]);

  return <AuthContext.Provider value={{ session, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
