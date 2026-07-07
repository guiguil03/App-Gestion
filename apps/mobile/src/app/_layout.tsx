import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { queryClient } from '@/api/client';
import { database } from '@/db/database';
import { SyncStatusProvider } from '@/features/sync/SyncStatusProvider';
import { Colors } from '@/theme/theme';

SplashScreen.preventAutoHideAsync();

// React Navigation a son propre thème par défaut (DarkTheme.colors.background
// est un noir quasi pur, indépendant de notre theme.ts) — on le remplace par
// nos propres tokens pour que le fond d'écran/tab bar restent cohérents.
const AppLightTheme: typeof DefaultTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.primary,
    background: Colors.light.background,
    card: Colors.light.background,
    text: Colors.light.text,
    border: Colors.light.border,
  },
};

const AppDarkTheme: typeof DarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.primary,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.border,
  },
};

// En Expo Go, database est null (module natif WatermelonDB indisponible) :
// on rend l'app sans DatabaseProvider plutôt que de planter au démarrage.
function MaybeDatabaseProvider({ children }: { children: ReactNode }) {
  if (!database) return <>{children}</>;
  return <DatabaseProvider database={database}>{children}</DatabaseProvider>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <MaybeDatabaseProvider>
      <QueryClientProvider client={queryClient}>
        <SyncStatusProvider>
          <ThemeProvider value={colorScheme === 'dark' ? AppDarkTheme : AppLightTheme}>
            <Stack screenOptions={{ headerShown: false }} />
          </ThemeProvider>
        </SyncStatusProvider>
      </QueryClientProvider>
    </MaybeDatabaseProvider>
  );
}
