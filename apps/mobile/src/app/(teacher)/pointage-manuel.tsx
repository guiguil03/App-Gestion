// apps/mobile/src/app/(teacher)/pointage-manuel.tsx
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';

import { resolveApiUrl } from '@/api/client';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ChipSelector } from '@/components/chip-selector';
import { EmptyState } from '@/components/empty-state';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import AttendanceRecord, { type Checkpoint } from '@/db/models/AttendanceRecord';
import Student from '@/db/models/Student';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { ScanFeedbackBanner, type ScanFeedback } from '@/features/attendance/components/ScanFeedbackBanner';
import { ScanWindowRejectionError, useRecordAttendance } from '@/features/attendance/hooks/useRecordAttendance';
import { useClassRoster, type RosterStatus } from '@/features/classes/hooks/useClassRoster';
import { useSelectedClass } from '@/features/classes/SelectedClassContext';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, withOpacity, type ThemeColor } from '@/theme/theme';

const STATUS_CONFIG: Record<RosterStatus, { label: string; colorToken: ThemeColor; icon: keyof typeof Ionicons.glyphMap }> = {
  present: { label: 'Présent', colorToken: 'success', icon: 'checkmark-circle' },
  late: { label: 'Retard', colorToken: 'warning', icon: 'time' },
  absent: { label: 'Absent', colorToken: 'danger', icon: 'close-circle' },
};

type Candidate = { studentId: string; studentName: string; photoUrl: string | null };

const MIN_SEARCH_LENGTH = 2;

export default function PointageManuelScreen() {
  const theme = useTheme();
  const database = useOptionalDatabase();
  const { checkpoint: checkpointParam } = useLocalSearchParams<{ checkpoint?: string }>();
  const checkpoint: Checkpoint = checkpointParam === 'classe' ? 'classe' : 'portail';

  const { classes, selectedClassId, setSelectedClassId } = useSelectedClass();
  const roster = useClassRoster(selectedClassId);
  const recordAttendance = useRecordAttendance();

  const [searchMode, setSearchMode] = useState(!selectedClassId);
  const [query, setQuery] = useState('');
  const [allStudents, setAllStudents] = useState<Student[] | null>(null);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [alreadyToday, setAlreadyToday] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [pending, setPending] = useState(false);

  // Chargé une seule fois : la liste des élèves d'une école (quelques
  // centaines maximum) tient largement en mémoire, pas besoin de requêter la
  // base à chaque frappe.
  useEffect(() => {
    if (!database || allStudents) return;
    database.get<Student>('students').query().fetch().then(setAllStudents);
  }, [database, allStudents]);

  const searchResults = useMemo(() => {
    if (!allStudents) return [];
    const q = query.trim().toLowerCase();
    if (q.length < MIN_SEARCH_LENGTH) return [];
    return allStudents.filter((student) => student.fullName.toLowerCase().includes(q)).slice(0, 30);
  }, [allStudents, query]);

  // Vérifié à la sélection plutôt que bloquant : un pointage manuel en double
  // dans la journée doit rester possible (même tolérance que le scan de
  // carte), juste signalé. Réinitialisé par `selectCandidate` (pas ici) pour
  // éviter un setState synchrone en tout début d'effet.
  useEffect(() => {
    if (!selected || !database) return;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    let cancelled = false;
    database
      .get<AttendanceRecord>('attendance_records')
      .query(Q.where('student_id', selected.studentId), Q.where('recorded_at', Q.gte(startOfDay.getTime())))
      .fetchCount()
      .then((count) => {
        if (!cancelled) setAlreadyToday(count);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, database]);

  function selectCandidate(candidate: Candidate | null) {
    setAlreadyToday(null);
    setSelected(candidate);
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

  async function handleConfirm() {
    if (!selected) return;
    setPending(true);
    try {
      const record = await recordAttendance(selected.studentId, checkpoint, { isManual: true });
      setFeedback({ status: 'ok', isLate: record.isLate });
      selectCandidate(null);
    } catch (error) {
      if (error instanceof ScanWindowRejectionError) {
        setFeedback({ status: error.reason });
      } else {
        console.error('[pointage-manuel] échec de l’enregistrement', error);
        setFeedback({ status: 'erreur' });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader
        title="Élève sans carte"
        subtitle={checkpoint === 'portail' ? 'Portail' : 'Salle de classe'}
        action={
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <Ionicons name="close" size={22} color={theme.text} />
          </Pressable>
        }
      />

      {selected ? (
        <Card style={styles.confirmCard}>
          <View style={styles.confirmHeader}>
            <Avatar name={selected.studentName} photoUrl={selected.photoUrl} size={48} />
            <View style={styles.confirmTexts}>
              <ThemedText type="smallBold">{selected.studentName}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {checkpoint === 'portail' ? 'Portail' : 'Salle de classe'}
              </ThemedText>
            </View>
          </View>

          {alreadyToday !== null && alreadyToday > 0 && (
            <View style={[styles.warningBox, { backgroundColor: withOpacity(theme.warning, '1A') }]}>
              <Ionicons name="alert-circle" size={16} color={theme.warning} />
              <ThemedText type="small" style={[styles.warningText, { color: theme.warning }]}>
                Cet élève a déjà un pointage aujourd’hui.
              </ThemedText>
            </View>
          )}

          <View style={styles.confirmActions}>
            <View style={styles.confirmActionFlex}>
              <Button label="Annuler" variant="tonal" onPress={() => selectCandidate(null)} disabled={pending} />
            </View>
            <View style={styles.confirmActionFlex}>
              <Button label="Confirmer présence" onPress={() => void handleConfirm()} loading={pending} />
            </View>
          </View>
        </Card>
      ) : (
        <>
          {classes.length > 0 && !searchMode ? (
            <>
              {classes.length > 1 && (
                <ChipSelector
                  items={classes.map((schoolClass) => ({ id: schoolClass.id, label: schoolClass.name }))}
                  selectedId={selectedClassId}
                  onSelect={setSelectedClassId}
                />
              )}
              <Pressable onPress={() => setSearchMode(true)}>
                <ThemedText type="linkPrimary">Rechercher un autre élève</ThemedText>
              </Pressable>
              <FlatList
                data={roster}
                keyExtractor={(entry) => entry.studentId}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                  const status = STATUS_CONFIG[item.status];
                  return (
                    <ListRow
                      leading={
                        <Avatar
                          name={item.studentName}
                          photoUrl={item.photoUrl ? resolveApiUrl(item.photoUrl) : null}
                          color={theme[status.colorToken]}
                        />
                      }
                      title={item.studentName}
                      trailing={
                        <View style={styles.statusTag}>
                          <Ionicons name={status.icon} size={16} color={theme[status.colorToken]} />
                          <ThemedText type="small" style={{ color: theme[status.colorToken] }}>
                            {status.label}
                          </ThemedText>
                        </View>
                      }
                      onPress={() =>
                        selectCandidate({
                          studentId: item.studentId,
                          studentName: item.studentName,
                          photoUrl: item.photoUrl ? resolveApiUrl(item.photoUrl) : null,
                        })
                      }
                    />
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyList}>
                    <ThemedText themeColor="textSecondary">Aucun élève dans cette classe.</ThemedText>
                  </View>
                }
              />
            </>
          ) : (
            <>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: theme.border, backgroundColor: theme.backgroundElement, color: theme.text },
                ]}
                placeholder="Rechercher un élève par nom..."
                placeholderTextColor={theme.textSecondary}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoFocus
              />
              {classes.length > 0 && (
                <Pressable
                  onPress={() => {
                    setSearchMode(false);
                    setQuery('');
                  }}
                >
                  <ThemedText type="linkPrimary">Retour à la liste de la classe</ThemedText>
                </Pressable>
              )}
              <FlatList
                data={searchResults}
                keyExtractor={(student) => student.id}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <ListRow
                    leading={<Avatar name={item.fullName} photoUrl={item.photoUrl ? resolveApiUrl(item.photoUrl) : null} />}
                    title={item.fullName}
                    onPress={() =>
                      selectCandidate({
                        studentId: item.id,
                        studentName: item.fullName,
                        photoUrl: item.photoUrl ? resolveApiUrl(item.photoUrl) : null,
                      })
                    }
                  />
                )}
                ListEmptyComponent={
                  <View style={styles.emptyList}>
                    <ThemedText themeColor="textSecondary">
                      {query.trim().length < MIN_SEARCH_LENGTH ? 'Tape au moins 2 lettres pour chercher.' : 'Aucun élève trouvé.'}
                    </ThemedText>
                  </View>
                }
              />
            </>
          )}
        </>
      )}

      <ScanFeedbackBanner feedback={feedback} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  emptyList: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  confirmCard: {
    gap: Spacing.three,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  confirmTexts: {
    gap: Spacing.half,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.small + 2,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  warningText: {
    flex: 1,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  confirmActionFlex: {
    flex: 1,
  },
});
