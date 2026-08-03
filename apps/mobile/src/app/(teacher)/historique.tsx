// apps/mobile/src/app/(teacher)/historique.tsx
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/card';
import { ChipSelector } from '@/components/chip-selector';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme/theme';
import { useSelectedClass } from '@/features/classes/SelectedClassContext';
import { useClassHistory } from '@/features/attendance/hooks/useClassHistory';

export default function HistoriqueScreen() {
  const theme = useTheme();
  const database = useOptionalDatabase();
  const { classes, classesLoading, selectedClassId, setSelectedClassId } = useSelectedClass();
  const [expandedDayKey, setExpandedDayKey] = useState<string | null>(null);

  const days = useClassHistory(selectedClassId);

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
      <ScreenHeader title="Historique" />

      {classes.length > 1 && (
        <ChipSelector
          items={classes.map((schoolClass) => ({ id: schoolClass.id, label: schoolClass.name }))}
          selectedId={selectedClassId}
          onSelect={setSelectedClassId}
        />
      )}

      <FlatList
        data={days}
        keyExtractor={(day) => day.dateKey}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isExpanded = expandedDayKey === item.dateKey;
          return (
            <Card style={styles.dayCard}>
              <Pressable style={styles.dayHeader} onPress={() => setExpandedDayKey(isExpanded ? null : item.dateKey)}>
                <View style={styles.dayHeaderText}>
                  <ThemedText type="smallBold" style={styles.dayLabel}>
                    {item.dateLabel}
                  </ThemedText>
                  <View style={styles.dayMetaRow}>
                    <ThemedText type="small" style={{ color: theme.danger }}>
                      {item.absentCount} absent{item.absentCount > 1 ? 's' : ''}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {' · '}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.warning }}>
                      {item.lateCount} retard{item.lateCount > 1 ? 's' : ''}
                    </ThemedText>
                  </View>
                </View>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.primary} />
              </Pressable>

              {isExpanded &&
                item.records.map((record) => (
                  <View key={record.id} style={styles.recordRow}>
                    <ThemedText type="small">{record.studentName}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {record.checkpoint === 'portail' ? 'Portail' : 'Salle de classe'} ·{' '}
                      {record.recordedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {record.isLate ? ' · Retard' : ''}
                    </ThemedText>
                  </View>
                ))}
            </Card>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <ThemedText themeColor="textSecondary">Aucun historique pour cette classe.</ThemedText>
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
    gap: Spacing.two,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dayHeaderText: {
    flex: 1,
    gap: Spacing.one,
  },
  dayMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayLabel: {
    textTransform: 'capitalize',
  },
  recordRow: {
    paddingLeft: Spacing.two,
    paddingVertical: Spacing.one,
    gap: Spacing.half,
  },
  emptyList: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
});
