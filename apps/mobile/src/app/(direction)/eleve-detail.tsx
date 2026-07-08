// apps/mobile/src/app/(direction)/eleve-detail.tsx
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { StudentForm, type StudentFormValues } from '@/features/students/components/StudentForm';
import { getStudentErrorMessage } from '@/features/students/errorMessage';
import { useStudent } from '@/features/students/hooks/useStudents';
import {
  useProvisionStudentAccount,
  useUpdateStudent,
  useUploadStudentPhoto,
} from '@/features/students/hooks/useStudentMutations';

export default function EleveDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: student, isLoading, isError, error } = useStudent(id ?? null);
  const { mutate: updateStudent, isPending: isUpdating } = useUpdateStudent(id as string);
  const { mutate: uploadPhoto, isPending: isUploadingPhoto } = useUploadStudentPhoto(id as string);
  const { mutate: provisionAccount, isPending: isProvisioning } = useProvisionStudentAccount(id as string);
  const [accountInfo, setAccountInfo] = useState<{ username: string; password: string } | null>(null);

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    uploadPhoto({
      uri: asset.uri,
      fileName: asset.fileName ?? 'photo.jpg',
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  }

  function handleProvisionAccount() {
    provisionAccount(undefined, {
      onSuccess: (account) => setAccountInfo(account),
      onError: () => Alert.alert('Erreur', "Impossible de générer le compte."),
    });
  }

  function handleSubmit(values: StudentFormValues) {
    updateStudent(values, {
      onSuccess: () => Alert.alert('Enregistré', 'Les informations ont été mises à jour.'),
      onError: () => Alert.alert('Erreur', "Impossible d'enregistrer les modifications."),
    });
  }

  if (isError) {
    return (
      <ThemedView style={styles.container}>
        <BackButton />
        <ThemedText style={[styles.message, { color: theme.danger }]}>{getStudentErrorMessage(error)}</ThemedText>
      </ThemedView>
    );
  }

  if (isLoading || !student) {
    return (
      <ThemedView style={styles.container}>
        <BackButton />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <BackButton />
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          {student.firstName} {student.lastName}
        </ThemedText>
      </View>

      <View style={styles.actionsRow}>
        <ActionButton
          icon="image-outline"
          label={isUploadingPhoto ? 'Envoi…' : 'Photo'}
          onPress={handlePickPhoto}
          disabled={isUploadingPhoto}
        />
        <ActionButton
          icon="qr-code-outline"
          label="Carte"
          onPress={() => router.push({ pathname: '/(direction)/eleve-carte', params: { id: student.id } })}
        />
        <ActionButton
          icon="key-outline"
          label={isProvisioning ? '…' : 'Compte'}
          onPress={handleProvisionAccount}
          disabled={isProvisioning}
        />
      </View>

      {accountInfo && (
        <ThemedView type="backgroundElement" bordered style={styles.accountBox}>
          <ThemedText type="smallBold">Identifiants générés (à noter, non récupérables ensuite) :</ThemedText>
          <ThemedText type="small">
            {accountInfo.username} / {accountInfo.password}
          </ThemedText>
        </ThemedView>
      )}

      <StudentForm
        submitLabel="Enregistrer"
        initialValues={{
          lastName: student.lastName,
          middleName: student.middleName ?? undefined,
          firstName: student.firstName,
          sex: student.sex,
          dateOfBirth: student.dateOfBirth,
          schoolClassId: student.schoolClassId,
          parent: student.parents[0]
            ? {
                fullName: student.parents[0].fullName,
                relationship: student.parents[0].relationship,
                phoneNumber: student.parents[0].phoneNumber,
                secondaryPhoneNumber: student.parents[0].secondaryPhoneNumber ?? undefined,
                address: student.parents[0].address ?? undefined,
              }
            : undefined,
        }}
        onSubmit={handleSubmit}
        isSubmitting={isUpdating}
      />
    </ThemedView>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      style={[styles.actionButton, { backgroundColor: theme.backgroundElement }, disabled && styles.actionDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={20} color={theme.primary} />
      <ThemedText type="small">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 24,
  },
  header: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
  },
  message: {
    textAlign: 'center',
    margin: 24,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionDisabled: {
    opacity: 0.6,
  },
  accountBox: {
    marginHorizontal: 24,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
});
