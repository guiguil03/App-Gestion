import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useAssignedClasses } from '@/features/classes/hooks/useAssignedClasses';
import { useClassAttendanceSummary } from '@/features/attendance/hooks/useClassAttendanceSummary';

const BRAND_COLOR = '#208AEF';
const SUCCESS_COLOR = '#16A34A';
const WARNING_COLOR = '#F59E0B';
const DANGER_COLOR = '#DC2626';

const TODAY_LABEL = new Date().toLocaleDateString('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export default function TeacherDashboardScreen() {
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
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Présence du jour
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.dateLabel}>
          {TODAY_LABEL}
        </ThemedText>
      </ThemedView>

      {classes.length > 1 && (
        <ThemedView type="backgroundElement" style={styles.classSwitch}>
          {classes.map((schoolClass) => (
            <Pressable
              key={schoolClass.id}
              style={[styles.classOption, selectedClassId === schoolClass.id && styles.classOptionActive]}
              onPress={() => setSelectedClassId(schoolClass.id)}
            >
              <ThemedText
                type="smallBold"
                style={selectedClassId === schoolClass.id ? styles.classOptionLabelActive : undefined}
              >
                {schoolClass.name}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      )}

      <ThemedView style={styles.summaryRow}>
        <SummaryStat label="Présents" value={summary.presentCount} color={SUCCESS_COLOR} icon="✓" />
        <SummaryStat label="En retard" value={summary.lateCount} color={WARNING_COLOR} icon="⏱" />
        <SummaryStat label="Absents" value={summary.absentCount} color={DANGER_COLOR} icon="✕" />
      </ThemedView>

      <ThemedView style={styles.listHeader}>
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
      </ThemedView>

      <FlatList
        data={summary.recentRecords}
        keyExtractor={(record) => record.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.row}>
            <ThemedView
              style={[styles.avatar, { backgroundColor: item.isLate ? WARNING_COLOR : SUCCESS_COLOR }]}
            >
              <ThemedText style={styles.avatarLabel}>{item.studentName.charAt(0).toUpperCase()}</ThemedText>
            </ThemedView>

            <ThemedView style={styles.rowContent}>
              <ThemedText type="smallBold">{item.studentName}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.checkpoint === 'portail' ? 'Portail' : 'Salle de classe'} ·{' '}
                {item.recordedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </ThemedText>
            </ThemedView>

            {item.isLate && (
              <ThemedView style={[styles.lateBadge, { backgroundColor: WARNING_COLOR }]}>
                <ThemedText type="small" style={styles.lateBadgeLabel}>
                  Retard
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        )}
        ListEmptyComponent={
          <ThemedView style={styles.emptyList}>
            <ThemedText themeColor="textSecondary">Aucun scan aujourd'hui pour cette classe.</ThemedText>
          </ThemedView>
        }
      />

      <Pressable style={styles.scanButton} onPress={() => router.push('/(teacher)/scan')}>
        <ThemedText style={styles.scanButtonIcon}>📷</ThemedText>
        <ThemedText style={styles.scanButtonLabel}>Scanner une carte</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function SummaryStat({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.summaryStat}>
      <ThemedView style={[styles.summaryIcon, { backgroundColor: color }]}>
        <ThemedText style={styles.summaryIconLabel}>{icon}</ThemedText>
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
  classSwitch: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    padding: 4,
    gap: 4,
  },
  classOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  classOptionActive: {
    backgroundColor: BRAND_COLOR,
  },
  classOptionLabelActive: {
    color: '#ffffff',
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
  summaryIconLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
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
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: BRAND_COLOR,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: BRAND_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scanButtonIcon: {
    fontSize: 18,
  },
  scanButtonLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
