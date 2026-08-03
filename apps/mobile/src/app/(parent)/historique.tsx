// apps/mobile/src/app/(parent)/historique.tsx
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ChipSelector } from '@/components/chip-selector';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme/theme';
import { useChildren } from '@/features/children/hooks/useChildren';
import { useChildHistory } from '@/features/attendance/hooks/useChildHistory';

export default function ParentHistoriqueScreen() {
  const theme = useTheme();
  const database = useOptionalDatabase();
  const children = useChildren();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  useEffect(() => {
    if (children.length === 0) {
      if (selectedChildId !== null) setSelectedChildId(null);
      return;
    }
    const stillPresent = children.some((child) => child.id === selectedChildId);
    if (!stillPresent) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const days = useChildHistory(selectedChildId);

  if (!database) {
    return (
      <Screen>
        <EmptyState
          icon="server-outline"
          title="Base locale indisponible"
          description="Cet écran nécessite la base locale WatermelonDB, indisponible dans Expo Go."
        />
      </Screen>
    );
  }

  if (children.length === 0) {
    return (
      <Screen>
        <EmptyState icon="people-outline" title="Aucun enfant synchronisé" description="Réessaie plus tard." />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Historique" />

      {children.length > 1 && (
        <ChipSelector
          items={children.map((child) => ({ id: child.id, label: child.fullName }))}
          selectedId={selectedChildId}
          onSelect={setSelectedChildId}
        />
      )}

      <FlatList
        data={days}
        keyExtractor={(day) => day.dateKey}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Card style={styles.dayCard}>
            <ThemedText type="smallBold" style={styles.dayLabel}>
              {item.dateLabel}
            </ThemedText>
            <ThemedText type="small" style={{ color: item.status === 'late' ? theme.warning : theme.success }}>
              {item.status === 'late' ? 'Arrivée en retard' : 'Présent'}
            </ThemedText>
            {item.records.map((record) => (
              <ThemedText key={record.id} type="small" themeColor="textSecondary">
                {record.checkpoint === 'portail' ? 'Portail' : 'Salle de classe'} ·{' '}
                {record.recordedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </ThemedText>
            ))}
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <ThemedText themeColor="textSecondary">Aucun historique pour cet enfant.</ThemedText>
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
  dayCard: {
    gap: Spacing.one,
  },
  dayLabel: {
    textTransform: 'capitalize',
  },
  emptyList: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
});
