import { DarkTheme, DefaultTheme, Stack, ThemeProvider, usePathname } from 'expo-router';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import * as Sentry from '@sentry/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/client';
import { database } from '@/db/database';
import { SyncStatusBadge } from '@/features/sync/components/SyncStatusBadge';
import { SyncStatusProvider } from '@/features/sync/SyncStatusProvider';
import { Colors } from '@/theme/theme';

SplashScreen.preventAutoHideAsync();

// DSN absent = SDK désactivé silencieusement (voir EXPO_PUBLIC_SENTRY_DSN
// dans .env — même projet Sentry que le backend/dashboard).
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 0.1,
});

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

// Les écrans de scan (enseignant/élève) affichent déjà leur propre badge,
// avec un décalage adapté à leur mise en page (switch checkpoint côté
// enseignant) — on évite un doublon là où c'est déjà couvert, et on affiche
// ce badge global partout ailleurs (avant, seuls les écrans de scan avaient
// un indicateur : un utilisateur consultant l'historique ou le dashboard
// hors ligne n'avait aucun signal).
function GlobalSyncStatusBadge() {
  const pathname = usePathname();
  if (pathname === '/scan') return null;
  return <SyncStatusBadge />;
}

function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <MaybeDatabaseProvider>
        <QueryClientProvider client={queryClient}>
          <SyncStatusProvider>
            <ThemeProvider value={colorScheme === 'dark' ? AppDarkTheme : AppLightTheme}>
              <View style={styles.root}>
                <Stack screenOptions={{ headerShown: false }} />
                <GlobalSyncStatusBadge />
              </View>
            </ThemeProvider>
          </SyncStatusProvider>
        </QueryClientProvider>
      </MaybeDatabaseProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default Sentry.wrap(RootLayout);
