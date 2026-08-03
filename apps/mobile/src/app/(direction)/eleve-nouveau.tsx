// apps/mobile/src/app/(direction)/eleve-nouveau.tsx
import { StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { BackButton } from '@/components/back-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/theme/theme';
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
    <Screen style={styles.container}>
      <BackButton />
      <ThemedText type="title" style={styles.title}>
        Nouvel élève
      </ThemedText>
      {error ? (
        <ThemedText style={styles.error} themeColor="danger">
          Erreur lors de la création — vérifie les champs et réessaie.
        </ThemedText>
      ) : null}
      <StudentForm submitLabel="Créer l'élève" initialValues={{ schoolClassId }} onSubmit={handleSubmit} isSubmitting={isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
  },
  title: {
    paddingHorizontal: Spacing.four,
  },
  error: {
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.two,
  },
});
