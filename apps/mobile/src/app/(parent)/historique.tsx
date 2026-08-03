// apps/mobile/src/app/(parent)/historique.tsx
import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { apiClient } from '@/api/client';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ChipSelector } from '@/components/chip-selector';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme/theme';
import { dateKey } from '@/features/attendance/dateKey';
import { useChildren } from '@/features/children/hooks/useChildren';
import { useChildHistory } from '@/features/attendance/hooks/useChildHistory';
import type { AttendanceHistoryEntry } from '@/features/reports/hooks/useReports';
import { buildReportHtml } from '@/services/reportHtml';

const REPORT_WINDOW_DAYS = 30;
const HISTORY_STATUS_LABEL: Record<AttendanceHistoryEntry['status'], string> = {
  PRESENT: 'Présent',
  LATE: 'En retard',
  ABSENT: 'Absent',
};

export default function ParentHistoriqueScreen() {
  const theme = useTheme();
  const database = useOptionalDatabase();
  const children = useChildren();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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

  async function handleExportReport() {
    setIsExporting(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - REPORT_WINDOW_DAYS);

      const { data: entries } = await apiClient.get<AttendanceHistoryEntry[]>('/reports/my-children', {
        params: { startDate: dateKey(startDate), endDate: dateKey(endDate) },
      });

      const html = buildReportHtml({
        title: 'Rapport de présence',
        subtitle: `Du ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}`,
        columns: ['Date', 'Enfant', 'Classe', 'Statut', 'Détail'],
        rows: entries.map((entry) => [
          new Date(entry.date).toLocaleDateString('fr-FR'),
          `${entry.student.firstName} ${entry.student.lastName}`,
          entry.student.schoolClass.name,
          HISTORY_STATUS_LABEL[entry.status],
          entry.status === 'ABSENT'
            ? entry.justified
              ? `Justifiée${entry.justificationReason ? ` — ${entry.justificationReason}` : ''}`
              : 'Non justifiée'
            : entry.recordedAt
              ? new Date(entry.recordedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
              : '—',
        ]),
      });

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
    } catch {
      Alert.alert('Erreur', "Impossible de générer le rapport. Vérifie ta connexion et réessaie.");
    } finally {
      setIsExporting(false);
    }
  }

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

      <Button
        label={isExporting ? 'Génération…' : 'Exporter le rapport (PDF, 30 derniers jours)'}
        icon="download-outline"
        variant="tonal"
        onPress={handleExportReport}
        disabled={isExporting}
      />

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
