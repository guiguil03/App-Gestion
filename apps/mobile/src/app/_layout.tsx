import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { queryClient } from '@/api/client';
import { database } from '@/db/database';

SplashScreen.preventAutoHideAsync();

// En Expo Go, database est null (module natif WatermelonDB indisponible) :
// on rend l'app sans DatabaseProvider plutôt que de planter au démarrage.
function MaybeDatabaseProvider({ children }: { children: ReactNode }) {
  if (!database) return <>{children}</>;
  return <DatabaseProvider database={database}>{children}</DatabaseProvider>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <MaybeDatabaseProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      </QueryClientProvider>
    </MaybeDatabaseProvider>
  );
}
