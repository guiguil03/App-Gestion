import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ChipSelector } from '@/components/chip-selector';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme/theme';
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
  parent: { fullName: '', relationship: '', phoneNumber: '', secondaryPhoneNumber: '', address: '', notificationChannel: 'BOTH' },
};

const NOTIFICATION_CHANNEL_OPTIONS: { id: string; label: string }[] = [
  { id: 'PUSH', label: 'Push' },
  { id: 'SMS', label: 'SMS' },
  { id: 'BOTH', label: 'Les deux' },
];

export function StudentForm({
  initialValues,
  submitLabel,
  onSubmit,
  isSubmitting,
  footer,
}: {
  initialValues?: Partial<StudentFormValues>;
  submitLabel: string;
  onSubmit: (values: StudentFormValues) => void;
  isSubmitting: boolean;
  /** Actions additionnelles rendues sous le bouton de soumission, dans la même zone scrollable (ex. suppression). */
  footer?: ReactNode;
}) {
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
      notificationChannel: initialValues?.parent?.notificationChannel ?? 'BOTH',
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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
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

        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          Préférence de notification
        </ThemedText>
        <ChipSelector
          items={NOTIFICATION_CHANNEL_OPTIONS}
          selectedId={values.parent?.notificationChannel ?? 'BOTH'}
          onSelect={(id) => setParent('notificationChannel', id as NonNullable<StudentFormValues['parent']>['notificationChannel'])}
        />
      </Section>

      <Button label={submitLabel} onPress={handleSubmit} disabled={!canSubmit} loading={isSubmitting} />
      {footer}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card style={styles.section}>
      <ThemedText type="smallBold" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {children}
    </Card>
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
        style={[styles.input, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]}
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
  scroll: {
    flex: 1,
  },
  container: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six - Spacing.two,
  },
  section: {
    gap: Spacing.two + 4,
  },
  sectionTitle: {
    marginBottom: Spacing.half,
  },
  field: {
    gap: Spacing.one + 2,
  },
  label: {
    marginLeft: Spacing.half,
    marginTop: Spacing.one,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radius.small + 2,
    paddingHorizontal: Spacing.three - 4,
    paddingVertical: Spacing.two + 2,
    fontSize: 15,
  },
});
