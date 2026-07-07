// apps/mobile/src/app/(teacher)/historique.tsx
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ChipSelector } from '@/components/chip-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useTheme } from '@/hooks/use-theme';
import { useAssignedClasses } from '@/features/classes/hooks/useAssignedClasses';
import { useClassHistory } from '@/features/attendance/hooks/useClassHistory';

export default function HistoriqueScreen() {
  const theme = useTheme();
  const database = useOptionalDatabase();
  const { classes, isLoading: classesLoading } = useAssignedClasses();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [expandedDayKey, setExpandedDayKey] = useState<string | null>(null);

  useEffect(() => {
    if (classes.length === 0) {
      if (selectedClassId !== null) setSelectedClassId(null);
      return;
    }
    const stillAssigned = classes.some((schoolClass) => schoolClass.id === selectedClassId);
    if (!stillAssigned) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const days = useClassHistory(selectedClassId);

  if (!database) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>
          Cet écran nécessite la base locale WatermelonDB, indisponible dans Expo Go.
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
        Historique
      </ThemedText>

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
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isExpanded = expandedDayKey === item.dateKey;
          return (
            <ThemedView type="backgroundElement" bordered style={styles.dayCard}>
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
            </ThemedView>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <ThemedText themeColor="textSecondary">Aucun historique pour cette classe.</ThemedText>
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
  listContent: {
    gap: 8,
    paddingBottom: 8,
  },
  dayCard: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayHeaderText: {
    flex: 1,
    gap: 4,
  },
  dayMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayLabel: {
    textTransform: 'capitalize',
  },
  recordRow: {
    paddingLeft: 8,
    paddingVertical: 4,
    gap: 2,
  },
  emptyList: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
