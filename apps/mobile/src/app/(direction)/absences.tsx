// apps/mobile/src/app/(direction)/absences.tsx
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { SearchInput } from '@/components/search-input';
import { ThemedText } from '@/components/themed-text';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme/theme';
import { type Absence, useAbsencesPaginated, useJustifyAbsence, useJustifyAbsencesBulk } from '@/features/absences/hooks/useAbsences';

type Tab = 'unjustified' | 'justified';

export default function AbsencesScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>('unjustified');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkReason, setBulkReason] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});

  const { data, isLoading } = useAbsencesPaginated({
    justified: tab === 'justified',
    search: debouncedSearch.trim() || undefined,
    page: 1,
    pageSize: 100,
  });
  const justify = useJustifyAbsence();
  const justifyBulk = useJustifyAbsencesBulk();

  const rows = data?.items ?? [];

  function switchTab(next: Tab) {
    setTab(next);
    setSelectMode(false);
    setSelectedIds(new Set());
    setExpandedId(null);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleJustifyOne(absence: Absence) {
    const reason = reasonDrafts[absence.id]?.trim();
    if (!reason) return;
    justify.mutate(
      { id: absence.id, reason },
      {
        onSuccess: () => {
          setExpandedId(null);
          setReasonDrafts((prev) => {
            const next = { ...prev };
            delete next[absence.id];
            return next;
          });
        },
        onError: () => Alert.alert('Erreur', "Impossible de justifier cette absence."),
      },
    );
  }

  function handleJustifyBulk() {
    if (!bulkReason.trim() || selectedIds.size === 0) return;
    justifyBulk.mutate(
      { absenceIds: [...selectedIds], reason: bulkReason.trim() },
      {
        onSuccess: () => {
          setSelectMode(false);
          setSelectedIds(new Set());
          setBulkReason('');
        },
        onError: () => Alert.alert('Erreur', 'Impossible de justifier ces absences.'),
      },
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="Absences"
        action={
          tab === 'unjustified' ? (
            <Pressable
              style={[styles.iconButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              onPress={() => {
                setSelectMode((prev) => !prev);
                setSelectedIds(new Set());
              }}
            >
              <Ionicons name={selectMode ? 'close' : 'checkmark-done-outline'} size={18} color={theme.text} />
            </Pressable>
          ) : undefined
        }
      />

      <View style={[styles.tabSwitch, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {(['unjustified', 'justified'] as const).map((option) => (
          <Pressable
            key={option}
            style={[styles.tabOption, tab === option && { backgroundColor: theme.active }]}
            onPress={() => switchTab(option)}
          >
            <ThemedText type="smallBold" style={tab === option ? { color: theme.activeText } : undefined}>
              {option === 'unjustified' ? 'Non justifiées' : 'Justifiées'}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <SearchInput value={search} onChangeText={setSearch} placeholder="Rechercher un élève…" />

      {selectMode && selectedIds.size > 0 && (
        <Card style={styles.bulkBar}>
          <ThemedText type="small" themeColor="textSecondary">
            {selectedIds.size} absence{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
          </ThemedText>
          <TextInput
            style={[styles.bulkInput, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]}
            value={bulkReason}
            onChangeText={setBulkReason}
            placeholder="Motif commun"
            placeholderTextColor={theme.textSecondary}
          />
          <Button
            label={justifyBulk.isPending ? 'Justification…' : `Justifier ${selectedIds.size}`}
            onPress={handleJustifyBulk}
            disabled={!bulkReason.trim() || justifyBulk.isPending}
          />
        </Card>
      )}

      {!isLoading && (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isExpanded = expandedId === item.id;
            return (
              <Card style={styles.row}>
                <Pressable
                  style={styles.rowHeader}
                  onPress={() =>
                    selectMode ? toggleSelected(item.id) : setExpandedId(isExpanded ? null : item.id)
                  }
                >
                  {selectMode && (
                    <Ionicons
                      name={selectedIds.has(item.id) ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={selectedIds.has(item.id) ? theme.active : theme.textSecondary}
                    />
                  )}
                  <View style={styles.rowText}>
                    <ThemedText type="smallBold">
                      {item.student.firstName} {item.student.lastName}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {new Date(item.date).toLocaleDateString('fr-FR')}
                      {tab === 'justified' && item.justificationReason ? ` · ${item.justificationReason}` : ''}
                    </ThemedText>
                  </View>
                  {tab === 'unjustified' && !selectMode && (
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
                  )}
                </Pressable>

                {tab === 'unjustified' && !selectMode && isExpanded && (
                  <View style={styles.expandRow}>
                    <TextInput
                      style={[styles.reasonInput, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]}
                      value={reasonDrafts[item.id] ?? ''}
                      onChangeText={(value) => setReasonDrafts((prev) => ({ ...prev, [item.id]: value }))}
                      placeholder="Motif de l'absence"
                      placeholderTextColor={theme.textSecondary}
                    />
                    <Button
                      label="Justifier"
                      onPress={() => handleJustifyOne(item)}
                      disabled={!reasonDrafts[item.id]?.trim() || justify.isPending}
                    />
                  </View>
                )}
              </Card>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <EmptyState
                icon="checkmark-done-circle-outline"
                title={tab === 'unjustified' ? 'Aucune absence à traiter' : 'Aucune absence justifiée'}
              />
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tabSwitch: {
    flexDirection: 'row',
    borderRadius: Radius.medium,
    borderWidth: 1,
    padding: Spacing.half,
  },
  tabOption: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Radius.small,
    alignItems: 'center',
  },
  bulkBar: {
    gap: Spacing.two,
  },
  bulkInput: {
    borderWidth: 1,
    borderRadius: Radius.small + 2,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
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
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  expandRow: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: Radius.small + 2,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
  emptyList: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
});
