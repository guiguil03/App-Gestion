import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ChipSelector } from '@/components/chip-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useTheme } from '@/hooks/use-theme';
import { useAssignedClasses } from '@/features/classes/hooks/useAssignedClasses';
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
  const { classes, isLoading: classesLoading } = useAssignedClasses();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

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

  const summary = useClassAttendanceSummary(selectedClassId);
  const trend = useClassAttendanceTrend(selectedClassId);

  if (!database) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>
          Ce dashboard nécessite la base locale WatermelonDB, indisponible dans Expo Go. Lance
          l'app via un dev client (npx expo run:android ou EAS Build) pour tester cet écran.
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
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Présence du jour
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.dateLabel}>
          {TODAY_LABEL}
        </ThemedText>
      </View>

      {classes.length > 1 && (
        <ChipSelector
          items={classes.map((schoolClass) => ({ id: schoolClass.id, label: schoolClass.name }))}
          selectedId={selectedClassId}
          onSelect={setSelectedClassId}
        />
      )}

      <View style={styles.summaryRow}>
        <SummaryStat label="Présents" value={summary.presentCount} color={theme.success} icon="checkmark-circle" />
        <SummaryStat label="En retard" value={summary.lateCount} color={theme.warning} icon="time" />
        <SummaryStat label="Absents" value={summary.absentCount} color={theme.danger} icon="close-circle" />
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
          <ThemedView type="backgroundElement" bordered style={styles.row}>
            <ThemedView
              style={[styles.avatar, { backgroundColor: item.isLate ? theme.warning : theme.success }]}
            >
              <ThemedText style={styles.avatarLabel}>{item.studentName.charAt(0).toUpperCase()}</ThemedText>
            </ThemedView>

            <View style={styles.rowContent}>
              <ThemedText type="smallBold">{item.studentName}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.checkpoint === 'portail' ? 'Portail' : 'Salle de classe'} ·{' '}
                {item.recordedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </ThemedText>
            </View>

            {item.isLate && (
              <ThemedView style={[styles.lateBadge, { backgroundColor: theme.warning }]}>
                <ThemedText type="small" style={styles.lateBadgeLabel}>
                  Retard
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        )}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <ThemedText themeColor="textSecondary">Aucun scan aujourd'hui pour cette classe.</ThemedText>
          </View>
        }
      />

    </ThemedView>
  );
}

function SummaryStat({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <ThemedView type="backgroundElement" bordered style={styles.summaryStat}>
      <ThemedView style={[styles.summaryIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={16} color="#ffffff" />
      </ThemedView>
      <ThemedText type="title" style={[styles.summaryValue, { color }]}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
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
  header: {
    gap: 2,
  },
  title: {
    fontSize: 24,
  },
  dateLabel: {
    textTransform: 'capitalize',
  },
  message: {
    textAlign: 'center',
    margin: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 4,
  },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 26,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    flex: 0,
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
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
    gap: 12,
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
  rowContent: {
    flex: 1,
    gap: 2,
  },
  lateBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lateBadgeLabel: {
    color: '#ffffff',
    fontWeight: '700',
  },
  emptyList: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
