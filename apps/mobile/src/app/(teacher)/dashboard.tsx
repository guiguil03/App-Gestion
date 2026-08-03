import { FlatList, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { ChipSelector } from '@/components/chip-selector';
import { EmptyState } from '@/components/empty-state';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { StatCard } from '@/components/stat-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme/theme';
import { useSelectedClass } from '@/features/classes/SelectedClassContext';
import { useClassAttendanceSummary } from '@/features/attendance/hooks/useClassAttendanceSummary';
import { useClassAttendanceTrend } from '@/features/attendance/hooks/useClassAttendanceTrend';
import { AttendanceTrendChart } from '@/features/attendance/components/AttendanceTrendChart';

const TODAY_LABEL = new Date().toLocaleDateString('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export default function TeacherDashboardScreen() {
  const theme = useTheme();
  const database = useOptionalDatabase();
  const { classes, classesLoading, selectedClassId, setSelectedClassId } = useSelectedClass();

  const summary = useClassAttendanceSummary(selectedClassId);
  const trend = useClassAttendanceTrend(selectedClassId);

  if (!database) {
    return (
      <Screen>
        <EmptyState
          icon="server-outline"
          title="Base locale indisponible"
          description="Ce dashboard nécessite la base locale WatermelonDB, indisponible dans Expo Go. Lance l'app via un dev client (npx expo run:android ou EAS Build) pour tester cet écran."
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
      <ScreenHeader title="Présence du jour" subtitle={TODAY_LABEL} />

      {classes.length > 1 && (
        <ChipSelector
          items={classes.map((schoolClass) => ({ id: schoolClass.id, label: schoolClass.name }))}
          selectedId={selectedClassId}
          onSelect={setSelectedClassId}
        />
      )}

      <View style={styles.summaryRow}>
        <StatCard label="Présents" value={summary.presentCount} color={theme.success} icon="checkmark-circle" />
        <StatCard label="En retard" value={summary.lateCount} color={theme.warning} icon="time" />
        <StatCard label="Absents" value={summary.absentCount} color={theme.danger} icon="close-circle" />
      </View>

      <AttendanceTrendChart trend={trend} />

      <View style={styles.listHeader}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Derniers scans
        </ThemedText>
        {summary.recentRecords.length > 0 && (
          <ThemedView type="backgroundElement" style={styles.countBadge}>
            <ThemedText type="small" themeColor="textSecondary">
              {summary.recentRecords.length}
            </ThemedText>
          </ThemedView>
        )}
      </View>

      <FlatList
        data={summary.recentRecords}
        keyExtractor={(record) => record.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ListRow
            leading={<Avatar name={item.studentName} color={item.isLate ? theme.warning : theme.success} />}
            title={item.studentName}
            subtitle={`${item.checkpoint === 'portail' ? 'Portail' : 'Salle de classe'} · ${item.recordedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            trailing={item.isLate ? <Badge label="Retard" tone="warning" /> : undefined}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <ThemedText themeColor="textSecondary">Aucun scan aujourd'hui pour cette classe.</ThemedText>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sectionTitle: {
    flex: 0,
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  emptyList: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
});
