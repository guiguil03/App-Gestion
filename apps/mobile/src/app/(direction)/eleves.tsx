// apps/mobile/src/app/(direction)/eleves.tsx
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ChipSelector } from '@/components/chip-selector';
import { EmptyState } from '@/components/empty-state';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { SearchInput } from '@/components/search-input';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme/theme';
import { apiClient, resolveApiUrl } from '@/api/client';
import { useSchoolClasses } from '@/features/classes/hooks/useSchoolClasses';
import { useSearchStudents, useStudents } from '@/features/students/hooks/useStudents';
import type { StudentCard } from '@/features/students/hooks/useStudentCard';
import { buildBatchCardHtml, type CardData } from '@/services/cardHtml';
import { buildQrCodeSvg } from '@/services/qrSvg';

export default function ElevesScreen() {
  const theme = useTheme();
  const { classes, isLoading: classesLoading } = useSchoolClasses();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const isSearching = debouncedSearch.trim().length > 0;
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (classes.length === 0) {
      if (selectedClassId !== null) setSelectedClassId(null);
      return;
    }
    const stillExists = classes.some((schoolClass) => schoolClass.id === selectedClassId);
    if (!stillExists) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const { data: classStudents, isLoading: classStudentsLoading } = useStudents(isSearching ? null : selectedClassId);
  const { data: searchResults, isLoading: searchLoading } = useSearchStudents(debouncedSearch);
  const students = isSearching ? searchResults : classStudents;
  const studentsLoading = isSearching ? searchLoading : classStudentsLoading;

  function toggleSelectMode() {
    setSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBatchPrint() {
    if (selectedIds.size === 0 || !students) return;
    setIsPrinting(true);
    try {
      const selectedStudents = students.filter((s) => selectedIds.has(s.id));
      const cards: CardData[] = [];
      let skipped = 0;

      for (const student of selectedStudents) {
        try {
          const { data: cardResult } = await apiClient.get<StudentCard>(`/cards/${student.id}`);
          cards.push({
            fullName: `${student.lastName} ${student.firstName}`,
            className: student.schoolClass.name,
            promotion: student.schoolClass.promotion,
            dateOfBirth: student.dateOfBirth,
            sex: student.sex,
            photoUrl: student.photoUrl ? resolveApiUrl(student.photoUrl) : null,
            qrSvg: buildQrCodeSvg(cardResult.qrCode, 130),
            cardId: cardResult.card.id,
            issuedAt: cardResult.card.issuedAt,
          });
        } catch {
          skipped += 1; // pas de carte émise pour cet élève
        }
      }

      if (cards.length === 0) {
        Alert.alert('Aucune carte', "Aucun des élèves sélectionnés n'a de carte émise.");
        return;
      }

      const html = buildBatchCardHtml(cards);
      const { uri } = await Print.printToFileAsync({ html, width: 243, height: 153 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
      if (skipped > 0) {
        Alert.alert('Cartes manquantes', `${skipped} élève(s) sans carte émise ont été ignorés.`);
      }
      setSelectMode(false);
      setSelectedIds(new Set());
    } catch {
      Alert.alert('Erreur', 'Impossible de générer les cartes.');
    } finally {
      setIsPrinting(false);
    }
  }

  if (classesLoading) {
    return <Screen />;
  }

  if (classes.length === 0) {
    return (
      <Screen>
        <EmptyState icon="school-outline" title="Aucune classe" description="Aucune classe dans cette école." />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="Élèves"
        action={
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.iconButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              onPress={toggleSelectMode}
            >
              <Ionicons
                name={selectMode ? 'close' : 'checkmark-done-outline'}
                size={18}
                color={theme.text}
              />
            </Pressable>
            <Pressable
              style={[styles.iconButton, { backgroundColor: theme.active }]}
              onPress={() =>
                router.push({ pathname: '/(direction)/eleve-nouveau', params: { schoolClassId: selectedClassId ?? '' } })
              }
            >
              <Ionicons name="add" size={22} color={theme.activeText} />
            </Pressable>
          </View>
        }
      />

      <SearchInput value={search} onChangeText={setSearch} placeholder="Rechercher un élève…" />

      {!isSearching && classes.length > 1 && (
        <ChipSelector
          items={classes.map((schoolClass) => ({ id: schoolClass.id, label: schoolClass.name }))}
          selectedId={selectedClassId}
          onSelect={setSelectedClassId}
        />
      )}

      {selectMode && (
        <Button
          label={isPrinting ? 'Génération…' : `Imprimer ${selectedIds.size} carte${selectedIds.size > 1 ? 's' : ''}`}
          icon="print-outline"
          onPress={handleBatchPrint}
          disabled={isPrinting || selectedIds.size === 0}
        />
      )}

      {!studentsLoading && (
        <FlatList
          data={students ?? []}
          keyExtractor={(student) => student.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ListRow
              leading={
                <View style={styles.leadingRow}>
                  {selectMode && (
                    <Ionicons
                      name={selectedIds.has(item.id) ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={selectedIds.has(item.id) ? theme.active : theme.textSecondary}
                    />
                  )}
                  <Avatar
                    name={item.firstName}
                    photoUrl={item.photoUrl ? resolveApiUrl(item.photoUrl) : null}
                    color={theme.primary}
                    size={40}
                  />
                </View>
              }
              title={`${item.lastName} ${item.firstName}`}
              subtitle={`${item.schoolClass.name} · ${item.schoolClass.promotion}`}
              onPress={() =>
                selectMode
                  ? toggleSelected(item.id)
                  : router.push({ pathname: '/(direction)/eleve-detail', params: { id: item.id } })
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <EmptyState
                icon="people-outline"
                title="Aucun élève"
                description={isSearching ? 'Aucun résultat pour cette recherche.' : 'Aucun élève dans cette classe.'}
              />
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  leadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
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
