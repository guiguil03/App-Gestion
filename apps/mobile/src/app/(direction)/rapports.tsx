// apps/mobile/src/app/(direction)/rapports.tsx
import { useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ChipSelector } from '@/components/chip-selector';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/theme/theme';
import { useSchoolClasses } from '@/features/classes/hooks/useSchoolClasses';
import { useAttendanceSummary } from '@/features/reports/hooks/useReports';
import { buildReportHtml } from '@/services/reportHtml';

const REPORT_WINDOW_DAYS = 30;
const ALL_CLASSES_ID = 'all';

function periodDates(): { startDate: string; endDate: string; startLabel: string; endLabel: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - REPORT_WINDOW_DAYS);
  const toKey = (d: Date) => d.toISOString().slice(0, 10);
  return {
    startDate: toKey(start),
    endDate: toKey(end),
    startLabel: start.toLocaleDateString('fr-FR'),
    endLabel: end.toLocaleDateString('fr-FR'),
  };
}

export default function RapportsScreen() {
  const { classes, isLoading: classesLoading } = useSchoolClasses();
  const [selectedClassId, setSelectedClassId] = useState<string>(ALL_CLASSES_ID);
  const [isExporting, setIsExporting] = useState(false);
  const { startDate, endDate, startLabel, endLabel } = periodDates();

  const effectiveClassId = selectedClassId === ALL_CLASSES_ID ? null : selectedClassId;
  const { data: summary, isLoading: summaryLoading } = useAttendanceSummary(effectiveClassId, startDate, endDate);

  async function handleExport() {
    if (!summary) return;
    setIsExporting(true);
    try {
      const html = buildReportHtml({
        title: 'Rapport de présence',
        subtitle: `Du ${startLabel} au ${endLabel}`,
        columns: ['Élève', 'Classe', 'Présences', 'Retards', 'Abs. justifiées', 'Abs. non justifiées'],
        rows: summary.map((row) => [
          `${row.student.firstName} ${row.student.lastName}`,
          row.student.schoolClass.name,
          String(row.presencesCount),
          String(row.lateCount),
          String(row.absencesJustifiedCount),
          String(row.absencesUnjustifiedCount),
        ]),
      });

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le rapport.');
    } finally {
      setIsExporting(false);
    }
  }

  if (classesLoading) {
    return <Screen />;
  }

  return (
    <Screen>
      <ScreenHeader title="Rapports" subtitle={`${startLabel} — ${endLabel}`} />

      <ChipSelector
        items={[{ id: ALL_CLASSES_ID, label: 'Toutes les classes' }, ...classes.map((c) => ({ id: c.id, label: c.name }))]}
        selectedId={selectedClassId}
        onSelect={setSelectedClassId}
      />

      <Button
        label={isExporting ? 'Génération…' : 'Exporter (PDF)'}
        icon="download-outline"
        variant="tonal"
        onPress={handleExport}
        disabled={isExporting || summaryLoading || !summary?.length}
      />

      {summaryLoading ? (
        <Screen />
      ) : (
        <FlatList
          data={summary ?? []}
          keyExtractor={(row) => row.student.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <View style={styles.rowHeader}>
                <ThemedText type="smallBold">
                  {item.student.firstName} {item.student.lastName}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.student.schoolClass.name}
                </ThemedText>
              </View>
              <View style={styles.statsRow}>
                <Stat label="Présences" value={item.presencesCount} />
                <Stat label="Retards" value={item.lateCount} />
                <Stat label="Abs. just." value={item.absencesJustifiedCount} />
                <Stat label="Abs. non just." value={item.absencesUnjustifiedCount} />
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <EmptyState icon="document-text-outline" title="Aucune donnée" description="Rien à afficher sur cette période." />
            </View>
          }
        />
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
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
  row: {
    gap: Spacing.two,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  emptyList: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
});
