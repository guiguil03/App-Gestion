// apps/mobile/src/app/(teacher)/classe.tsx
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { resolveApiUrl } from '@/api/client';
import { ChipSelector } from '@/components/chip-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useTheme } from '@/hooks/use-theme';
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
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>
          Cet écran nécessite la base locale WatermelonDB, indisponible dans Expo Go. Lance l'app
          via un dev client (npx expo run:android ou EAS Build) pour tester cet écran.
        </ThemedText>
      </ThemedView>
    );
  }

  if (classesLoading) {
    return <ThemedView style={styles.container} />;
  }

  if (classes.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>Aucune classe assignée — contacte l'administration.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Classe
      </ThemedText>

      {classes.length > 1 && (
        <ChipSelector
          items={classes.map((schoolClass) => ({ id: schoolClass.id, label: schoolClass.name }))}
          selectedId={selectedClassId}
          onSelect={setSelectedClassId}
        />
      )}

      {selectedClassId && (
        <Pressable
          style={({ pressed }) => [
            styles.sessionButton,
            { backgroundColor: theme.primary },
            pressed && styles.sessionButtonPressed,
          ]}
          onPress={() => router.push('/(teacher)/session')}
        >
          <Ionicons name="qr-code-outline" size={18} color="#ffffff" />
          <ThemedText style={styles.sessionButtonLabel}>Créer une session</ThemedText>
        </Pressable>
      )}

      <FlatList
        data={roster}
        keyExtractor={(entry) => entry.studentId}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" bordered style={styles.row}>
            {item.photoUrl ? (
              <Image source={{ uri: resolveApiUrl(item.photoUrl) }} style={styles.avatarPhoto} />
            ) : (
              <ThemedView style={[styles.avatar, { backgroundColor: theme[STATUS_CONFIG[item.status].colorToken] }]}>
                <ThemedText style={styles.avatarLabel}>{item.studentName.charAt(0).toUpperCase()}</ThemedText>
              </ThemedView>
            )}
            <ThemedText type="smallBold" style={styles.rowName}>
              {item.studentName}
            </ThemedText>
            <Ionicons
              name={STATUS_CONFIG[item.status].icon}
              size={16}
              color={theme[STATUS_CONFIG[item.status].colorToken]}
            />
            <ThemedText type="small" style={{ color: theme[STATUS_CONFIG[item.status].colorToken] }}>
              {STATUS_CONFIG[item.status].label}
            </ThemedText>
          </ThemedView>
        )}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <ThemedText themeColor="textSecondary">Aucun élève dans cette classe.</ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
  },
  message: {
    textAlign: 'center',
    margin: 24,
  },
  sessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
  },
  sessionButtonPressed: {
    opacity: 0.85,
  },
  sessionButtonLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 8,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPhoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarLabel: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  rowName: {
    flex: 1,
  },
  emptyList: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
