// apps/mobile/src/app/(direction)/eleve-nouveau.tsx
import { StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StudentForm, type StudentFormValues } from '@/features/students/components/StudentForm';
import { useCreateStudent } from '@/features/students/hooks/useStudentMutations';

export default function EleveNouveauScreen() {
  const { schoolClassId } = useLocalSearchParams<{ schoolClassId?: string }>();
  const { mutate: createStudent, isPending, error } = useCreateStudent();

  function handleSubmit(values: StudentFormValues) {
    createStudent(values, {
      onSuccess: (student) => {
        router.replace({ pathname: '/(direction)/eleve-detail', params: { id: student.id } });
      },
    });
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Nouvel élève
      </ThemedText>
      {error ? (
        <ThemedText style={styles.error} themeColor="danger">
          Erreur lors de la création — vérifie les champs et réessaie.
        </ThemedText>
      ) : null}
      <StudentForm submitLabel="Créer l'élève" initialValues={{ schoolClassId }} onSubmit={handleSubmit} isSubmitting={isPending} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    paddingHorizontal: 24,
  },
  error: {
    paddingHorizontal: 24,
    marginTop: 8,
  },
});
