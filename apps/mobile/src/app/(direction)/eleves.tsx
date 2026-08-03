// apps/mobile/src/app/(direction)/eleves.tsx
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '@/components/avatar';
import { ChipSelector } from '@/components/chip-selector';
import { EmptyState } from '@/components/empty-state';
import { ListRow } from '@/components/list-row';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme/theme';
import { resolveApiUrl } from '@/api/client';
import { useSchoolClasses } from '@/features/classes/hooks/useSchoolClasses';
import { useStudents } from '@/features/students/hooks/useStudents';

export default function ElevesScreen() {
  const theme = useTheme();
  const { classes, isLoading: classesLoading } = useSchoolClasses();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

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

  const { data: students, isLoading: studentsLoading } = useStudents(selectedClassId);

  if (classesLoading) {
    return <ThemedView style={styles.container} />;
  }

  if (classes.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState icon="school-outline" title="Aucune classe" description="Aucune classe dans cette école." />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title="Élèves"
        action={
          <Pressable
            style={[styles.addButton, { backgroundColor: theme.primary }]}
            onPress={() =>
              router.push({ pathname: '/(direction)/eleve-nouveau', params: { schoolClassId: selectedClassId ?? '' } })
            }
          >
            <Ionicons name="add" size={22} color="#ffffff" />
          </Pressable>
        }
      />

      {classes.length > 1 && (
        <ChipSelector
          items={classes.map((schoolClass) => ({ id: schoolClass.id, label: schoolClass.name }))}
          selectedId={selectedClassId}
          onSelect={setSelectedClassId}
        />
      )}

      {studentsLoading ? (
        <ThemedView style={styles.container} />
      ) : (
        <FlatList
          data={students ?? []}
          keyExtractor={(student) => student.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ListRow
              leading={
                <Avatar
                  name={item.firstName}
                  photoUrl={item.photoUrl ? resolveApiUrl(item.photoUrl) : null}
                  color={theme.primary}
                  size={40}
                />
              }
              title={`${item.lastName} ${item.firstName}`}
              subtitle={`${item.schoolClass.name} · ${item.schoolClass.promotion}`}
              onPress={() => router.push({ pathname: '/(direction)/eleve-detail', params: { id: item.id } })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <EmptyState icon="people-outline" title="Aucun élève" description="Aucun élève dans cette classe." />
            </View>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
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
