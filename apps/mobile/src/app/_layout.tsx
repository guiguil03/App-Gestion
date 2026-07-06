import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { queryClient } from '@/api/client';
import { database } from '@/db/database';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <DatabaseProvider database={database}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(teacher)" />
            <Stack.Screen name="(parent)" />
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </DatabaseProvider>
  );
}
