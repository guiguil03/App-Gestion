// apps/mobile/src/app/(teacher)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';
import { SelectedClassProvider } from '@/features/classes/SelectedClassContext';

export default function TeacherTabsLayout() {
  const theme = useTheme();

  return (
    <SelectedClassProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="classe"
          options={{
            title: 'Classe',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'camera' : 'camera-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="historique"
          options={{
            title: 'Historique',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'time' : 'time-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profil"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={22} color={color} />
            ),
          }}
        />
        {/* Ouverte depuis le bouton "Créer une session" de l'écran Classe —
            pas un onglet à part entière. */}
        <Tabs.Screen name="session" options={{ href: null, headerShown: false }} />
      </Tabs>
    </SelectedClassProvider>
  );
}
