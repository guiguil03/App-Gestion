// apps/mobile/src/app/(direction)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';

export default function DirectionTabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
      }}
    >
      <Tabs.Screen
        name="eleves"
        options={{
          title: 'Élèves',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
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
      {/* Écrans ouverts depuis la liste Élèves — pas des onglets à part entière. */}
      <Tabs.Screen name="eleve-nouveau" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="eleve-detail" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="eleve-carte" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
