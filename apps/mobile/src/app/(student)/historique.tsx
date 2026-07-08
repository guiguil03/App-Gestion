// apps/mobile/src/app/(student)/historique.tsx
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useTheme } from '@/hooks/use-theme';
import { useChildHistory } from '@/features/attendance/hooks/useChildHistory';
import { getDecodedAccessToken } from '@/services/secureStorage';

export default function StudentHistoriqueScreen() {
  const theme = useTheme();
  const database = useOptionalDatabase();
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    getDecodedAccessToken().then((payload) => setStudentId(payload?.studentId ?? null));
  }, []);

  const days = useChildHistory(studentId, true);

  if (!database) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>
          Cet écran nécessite la base locale WatermelonDB, indisponible dans Expo Go.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Historique
      </ThemedText>

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
            <ThemedText themeColor="textSecondary">Aucun historique pour le moment.</ThemedText>
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
