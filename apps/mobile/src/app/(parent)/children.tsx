import { useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/react';

import Student from '@/db/models/Student';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// Le backend ne synchronise vers un compte parent que les fiches de ses
// propres enfants (voir SyncModule) : toute la table locale `students`
// représente donc déjà la liste "mes enfants".
function useChildren(): Student[] {
  const database = useDatabase();
  const [children, setChildren] = useState<Student[]>([]);

  useEffect(() => {
    const subscription = database
      .get<Student>('students')
      .query()
      .observe()
      .subscribe(setChildren);
    return () => subscription.unsubscribe();
  }, [database]);

  return children;
}

export default function ChildrenScreen() {
  const children = useChildren();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Mes enfants
      </ThemedText>
      <FlatList
        data={children}
        keyExtractor={(student) => student.id}
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.row}>
            <ThemedText type="smallBold">{item.fullName}</ThemedText>
          </ThemedView>
        )}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary">
            Aucun enfant synchronisé pour le moment.
          </ThemedText>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  title: {
    marginBottom: 8,
  },
  row: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
});
