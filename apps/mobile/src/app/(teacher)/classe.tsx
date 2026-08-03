// apps/mobile/src/app/(teacher)/classe.tsx
import { FlatList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { resolveApiUrl } from '@/api/client';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ChipSelector } from '@/components/chip-selector';
import { EmptyState } from '@/components/empty-state';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme/theme';
import { useSelectedClass } from '@/features/classes/SelectedClassContext';
import { useClassRoster, type RosterStatus } from '@/features/classes/hooks/useClassRoster';
import type { ThemeColor } from '@/theme/theme';

const STATUS_CONFIG: Record<RosterStatus, { label: string; colorToken: ThemeColor; icon: keyof typeof Ionicons.glyphMap }> = {
  present: { label: 'Présent', colorToken: 'success', icon: 'checkmark-circle' },
  late: { label: 'Retard', colorToken: 'warning', icon: 'time' },
  absent: { label: 'Absent', colorToken: 'danger', icon: 'close-circle' },
};

export default function ClasseScreen() {
  const theme = useTheme();
  const database = useOptionalDatabase();
  const { classes, classesLoading, selectedClassId, setSelectedClassId } = useSelectedClass();

  const roster = useClassRoster(selectedClassId);

  if (!database) {
    return (
      <Screen>
        <EmptyState
          icon="server-outline"
          title="Base locale indisponible"
          description="Cet écran nécessite la base locale WatermelonDB, indisponible dans Expo Go. Lance l'app via un dev client (npx expo run:android ou EAS Build) pour tester cet écran."
        />
      </Screen>
    );
  }

  if (classesLoading) {
    return <Screen />;
  }

  if (classes.length === 0) {
    return (
      <Screen>
        <EmptyState icon="school-outline" title="Aucune classe assignée" description="Contacte l'administration." />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Classe" />

      {classes.length > 1 && (
        <ChipSelector
          items={classes.map((schoolClass) => ({ id: schoolClass.id, label: schoolClass.name }))}
          selectedId={selectedClassId}
          onSelect={setSelectedClassId}
        />
      )}

      {selectedClassId && (
        <Button label="Créer une session" icon="qr-code-outline" onPress={() => router.push('/(teacher)/session')} />
      )}

      <FlatList
        data={roster}
        keyExtractor={(entry) => entry.studentId}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const status = STATUS_CONFIG[item.status];
          return (
            <ListRow
              leading={
                <Avatar
                  name={item.studentName}
                  photoUrl={item.photoUrl ? resolveApiUrl(item.photoUrl) : null}
                  color={theme[status.colorToken]}
                />
              }
              title={item.studentName}
              trailing={
                <View style={styles.statusTag}>
                  <Ionicons name={status.icon} size={16} color={theme[status.colorToken]} />
                  <ThemedText type="small" style={{ color: theme[status.colorToken] }}>
                    {status.label}
                  </ThemedText>
                </View>
              }
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <ThemedText themeColor="textSecondary">Aucun élève dans cette classe.</ThemedText>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  emptyList: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
});
