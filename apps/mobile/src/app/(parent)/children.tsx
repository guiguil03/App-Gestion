// apps/mobile/src/app/(parent)/children.tsx
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useTheme } from '@/hooks/use-theme';
import { useChildren } from '@/features/children/hooks/useChildren';

export default function ChildrenScreen() {
  const theme = useTheme();
  const database = useOptionalDatabase();
  const children = useChildren();

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

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Mes enfants
      </ThemedText>
      <FlatList
        data={children}
        keyExtractor={(student) => student.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: '/(parent)/enfant-detail', params: { id: item.id } })}>
            <ThemedView type="backgroundElement" bordered style={styles.row}>
              <ThemedView style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <ThemedText style={styles.avatarLabel}>{item.fullName.charAt(0).toUpperCase()}</ThemedText>
              </ThemedView>
              <ThemedText type="smallBold" style={styles.rowName}>
                {item.fullName}
              </ThemedText>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </ThemedView>
          </Pressable>
        )}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary">Aucun enfant synchronisé pour le moment.</ThemedText>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
  },
  listContent: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  rowName: {
    flex: 1,
  },
  message: {
    textAlign: 'center',
  },
});
