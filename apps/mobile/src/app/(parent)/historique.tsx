// apps/mobile/src/app/(parent)/historique.tsx
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useTheme } from '@/hooks/use-theme';
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
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>
          Cet écran nécessite la base locale WatermelonDB, indisponible dans Expo Go.
        </ThemedText>
      </ThemedView>
    );
  }

  if (children.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>Aucun enfant synchronisé pour le moment.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Historique
      </ThemedText>

      {children.length > 1 && (
        <ThemedView type="backgroundElement" style={styles.childSwitch}>
          {children.map((child) => (
            <Pressable
              key={child.id}
              style={[styles.childOption, selectedChildId === child.id && { backgroundColor: theme.primary }]}
              onPress={() => setSelectedChildId(child.id)}
            >
              <ThemedText
                type="smallBold"
                style={selectedChildId === child.id ? styles.childOptionLabelActive : undefined}
              >
                {child.fullName}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      )}

      <FlatList
        data={days}
        keyExtractor={(day) => day.dateKey}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" bordered style={styles.dayCard}>
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
          </ThemedView>
        )}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <ThemedText themeColor="textSecondary">Aucun historique pour cet enfant.</ThemedText>
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
  childSwitch: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    padding: 4,
    gap: 4,
  },
  childOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  childOptionLabelActive: {
    color: '#ffffff',
  },
  listContent: {
    gap: 8,
    paddingBottom: 8,
  },
  dayCard: {
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  dayLabel: {
    textTransform: 'capitalize',
  },
  emptyList: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
