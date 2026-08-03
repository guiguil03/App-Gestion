// apps/mobile/src/app/(student)/historique.tsx
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme/theme';
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
      <Screen>
        <EmptyState
          icon="server-outline"
          title="Base locale indisponible"
          description="Cet écran nécessite la base locale WatermelonDB, indisponible dans Expo Go."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Historique" />

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
            <ThemedText themeColor="textSecondary">Aucun historique pour le moment.</ThemedText>
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
