import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ChipSelector } from '@/components/chip-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useSchoolClasses } from '@/features/classes/hooks/useSchoolClasses';
import type { StudentInput } from '@/features/students/types';

export type StudentFormValues = StudentInput;

const EMPTY_VALUES: StudentFormValues = {
  lastName: '',
  middleName: '',
  firstName: '',
  sex: 'M',
  dateOfBirth: '',
  schoolClassId: '',
  parent: { fullName: '', relationship: '', phoneNumber: '', secondaryPhoneNumber: '', address: '' },
};

export function StudentForm({
  initialValues,
  submitLabel,
  onSubmit,
  isSubmitting,
}: {
  initialValues?: Partial<StudentFormValues>;
  submitLabel: string;
  onSubmit: (values: StudentFormValues) => void;
  isSubmitting: boolean;
}) {
  const theme = useTheme();
  const { classes } = useSchoolClasses();
  const [values, setValues] = useState<StudentFormValues>({
    ...EMPTY_VALUES,
    ...initialValues,
    parent: {
      fullName: initialValues?.parent?.fullName ?? '',
      relationship: initialValues?.parent?.relationship ?? '',
      phoneNumber: initialValues?.parent?.phoneNumber ?? '',
      secondaryPhoneNumber: initialValues?.parent?.secondaryPhoneNumber ?? '',
      address: initialValues?.parent?.address ?? '',
    },
  });

  function set<K extends keyof StudentFormValues>(key: K, value: StudentFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function setParent<K extends keyof NonNullable<StudentFormValues['parent']>>(
    key: K,
    value: NonNullable<StudentFormValues['parent']>[K],
  ) {
    setValues((prev) => ({ ...prev, parent: { ...prev.parent!, [key]: value } }));
  }

  const canSubmit =
    values.lastName.trim().length > 0 &&
    values.firstName.trim().length > 0 &&
    values.dateOfBirth.trim().length > 0 &&
    values.schoolClassId.trim().length > 0 &&
    !isSubmitting;

  function handleSubmit() {
    if (!canSubmit) return;
    const hasParentInfo = values.parent?.fullName.trim() && values.parent?.phoneNumber.trim();
    onSubmit({
      ...values,
      middleName: values.middleName?.trim() || undefined,
      parent: hasParentInfo
        ? {
            ...values.parent!,
            secondaryPhoneNumber: values.parent!.secondaryPhoneNumber?.trim() || undefined,
            address: values.parent!.address?.trim() || undefined,
          }
        : undefined,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Section title="Identité">
        <Field label="Nom *" value={values.lastName} onChangeText={(v) => set('lastName', v)} />
        <Field label="Post-nom" value={values.middleName ?? ''} onChangeText={(v) => set('middleName', v)} />
        <Field label="Prénom *" value={values.firstName} onChangeText={(v) => set('firstName', v)} />

        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          Sexe
        </ThemedText>
        <ChipSelector
          items={[
            { id: 'M', label: 'Masculin' },
            { id: 'F', label: 'Féminin' },
          ]}
          selectedId={values.sex}
          onSelect={(id) => set('sex', id)}
        />

        <Field
          label="Date de naissance * (AAAA-MM-JJ)"
          value={values.dateOfBirth}
          onChangeText={(v) => set('dateOfBirth', v)}
          placeholder="2018-04-12"
        />

        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          Classe *
        </ThemedText>
        <ChipSelector
          items={classes.map((c) => ({ id: c.id, label: c.name }))}
          selectedId={values.schoolClassId || null}
          onSelect={(id) => set('schoolClassId', id)}
        />
      </Section>

      <Section title="Parent / tuteur">
        <Field
          label="Nom complet"
          value={values.parent?.fullName ?? ''}
          onChangeText={(v) => setParent('fullName', v)}
        />
        <Field
          label="Lien de parenté"
          value={values.parent?.relationship ?? ''}
          onChangeText={(v) => setParent('relationship', v)}
          placeholder="Mère, Père, Tuteur…"
        />
        <Field
          label="Téléphone principal"
          value={values.parent?.phoneNumber ?? ''}
          onChangeText={(v) => setParent('phoneNumber', v)}
          keyboardType="phone-pad"
        />
        <Field
          label="Téléphone secondaire"
          value={values.parent?.secondaryPhoneNumber ?? ''}
          onChangeText={(v) => setParent('secondaryPhoneNumber', v)}
          keyboardType="phone-pad"
        />
        <Field
          label="Adresse de résidence"
          value={values.parent?.address ?? ''}
          onChangeText={(v) => setParent('address', v)}
        />
      </Section>

      <Pressable
        style={({ pressed }) => [
          styles.submitButton,
          { backgroundColor: theme.primary },
          (!canSubmit || pressed) && styles.submitButtonDisabled,
        ]}
        disabled={!canSubmit}
        onPress={handleSubmit}
      >
        <ThemedText style={styles.submitLabel}>{submitLabel}</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ThemedView type="backgroundElement" bordered style={styles.section}>
      <ThemedText type="smallBold" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {children}
    </ThemedView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad';
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
      <TextInput
        style={[
          styles.input,
          { borderColor: theme.backgroundSelected, backgroundColor: theme.background, color: theme.text },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
    paddingBottom: 48,
  },
  section: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    marginBottom: 2,
  },
  field: {
    gap: 6,
  },
  label: {
    marginLeft: 2,
    marginTop: 4,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
