// apps/mobile/src/app/(direction)/eleves.tsx
import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ChipSelector } from '@/components/chip-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
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
        <ThemedText style={styles.message}>Aucune classe dans cette école.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Élèves
        </ThemedText>
        <Pressable
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() =>
            router.push({ pathname: '/(direction)/eleve-nouveau', params: { schoolClassId: selectedClassId ?? '' } })
          }
        >
          <Ionicons name="add" size={22} color="#ffffff" />
        </Pressable>
      </View>

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
            <Pressable
              onPress={() => router.push({ pathname: '/(direction)/eleve-detail', params: { id: item.id } })}
            >
              <ThemedView type="backgroundElement" bordered style={styles.row}>
                {item.photoUrl ? (
                  <Image source={{ uri: resolveApiUrl(item.photoUrl) }} style={styles.avatarImage} />
                ) : (
                  <ThemedView style={[styles.avatar, { backgroundColor: theme.primary }]}>
                    <ThemedText style={styles.avatarLabel}>{item.firstName.charAt(0).toUpperCase()}</ThemedText>
                  </ThemedView>
                )}
                <View style={styles.rowContent}>
                  <ThemedText type="smallBold">
                    {item.lastName} {item.firstName}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.schoolClass.name} · {item.schoolClass.promotion}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </ThemedView>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <ThemedText themeColor="textSecondary">Aucun élève dans cette classe.</ThemedText>
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
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    margin: 24,
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
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  emptyList: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
