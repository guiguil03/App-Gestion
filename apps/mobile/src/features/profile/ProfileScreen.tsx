// apps/mobile/src/features/profile/ProfileScreen.tsx
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLogout } from '@/api/hooks/useLogout';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import School from '@/db/models/School';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { Spacing } from '@/theme/theme';
import { getDecodedAccessToken } from '@/services/secureStorage';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  DIRECTION: 'Direction',
  ENSEIGNANT: 'Enseignant',
  SURVEILLANT: 'Surveillant',
  PARENT: 'Parent',
  ELEVE: 'Élève',
};

export function ProfileScreen() {
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
      <ScreenHeader title="Profil" />

      <Card style={styles.card}>
        <ProfileRow label="Identifiant" value={username ?? '—'} />
        <ProfileRow label="Rôle" value={role ? (ROLE_LABELS[role] ?? role) : '—'} />
        <ProfileRow label="École" value={schoolName ?? '—'} />
      </Card>

      <Button label="Déconnexion" variant="danger" icon="log-out-outline" onPress={logout} />
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.four,
  },
  card: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
