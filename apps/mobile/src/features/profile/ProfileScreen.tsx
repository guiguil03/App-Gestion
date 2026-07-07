// apps/mobile/src/features/profile/ProfileScreen.tsx
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useLogout } from '@/api/hooks/useLogout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import School from '@/db/models/School';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useTheme } from '@/hooks/use-theme';
import { getDecodedAccessToken } from '@/services/secureStorage';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  DIRECTION: 'Direction',
  ENSEIGNANT: 'Enseignant',
  SURVEILLANT: 'Surveillant',
  PARENT: 'Parent',
};

export function ProfileScreen() {
  const theme = useTheme();
  const database = useOptionalDatabase();
  const logout = useLogout();
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    getDecodedAccessToken().then(async (payload) => {
      if (isCancelled || !payload) return;
      setUsername(payload.username);
      setRole(payload.role);

      if (!database || !payload.schoolId) return;
      const school = await database
        .get<School>('schools')
        .find(payload.schoolId)
        .catch(() => null);
      if (!isCancelled && school) setSchoolName(school.name);
    });

    return () => {
      isCancelled = true;
    };
  }, [database]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Profil
      </ThemedText>

      <ThemedView type="backgroundElement" bordered style={styles.card}>
        <ProfileRow label="Identifiant" value={username ?? '—'} />
        <ProfileRow label="Rôle" value={role ? (ROLE_LABELS[role] ?? role) : '—'} />
        <ProfileRow label="École" value={schoolName ?? '—'} />
      </ThemedView>

      <Pressable style={[styles.logoutButton, { backgroundColor: theme.danger }]} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color="#ffffff" />
        <ThemedText style={styles.logoutLabel}>Déconnexion</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 20,
  },
  title: {
    fontSize: 24,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  logoutLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
