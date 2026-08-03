// apps/mobile/src/app/(parent)/children.tsx
import { FlatList, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { ListRow } from '@/components/list-row';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedView } from '@/components/themed-view';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme/theme';
import { useChildren } from '@/features/children/hooks/useChildren';

export default function ChildrenScreen() {
  const theme = useTheme();
  const database = useOptionalDatabase();
  const children = useChildren();

  if (!database) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState
          icon="server-outline"
          title="Base locale indisponible"
          description="Cet écran nécessite la base locale WatermelonDB, indisponible dans Expo Go. Lance l'app via un dev client (npx expo run:android ou EAS Build) pour tester cet écran."
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Mes enfants" />
      <FlatList
        data={children}
        keyExtractor={(student) => student.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ListRow
            leading={<Avatar name={item.fullName} color={theme.primary} />}
            title={item.fullName}
            onPress={() => router.push({ pathname: '/(parent)/enfant-detail', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          <EmptyState icon="people-outline" title="Aucun enfant" description="Aucun enfant synchronisé pour le moment." />
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  listContent: {
    gap: Spacing.two,
  },
});
