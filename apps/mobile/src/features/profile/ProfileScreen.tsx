// apps/mobile/src/features/profile/ProfileScreen.tsx
import { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { resolveApiUrl } from '@/api/client';
import { useLogout } from '@/api/hooks/useLogout';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import School from '@/db/models/School';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useUploadStudentPhoto } from '@/features/students/hooks/useStudentMutations';
import { useMyStudent } from '@/features/students/hooks/useStudents';
import { useTheme } from '@/hooks/use-theme';
import { getDecodedAccessToken } from '@/services/secureStorage';
import { Radius, Spacing } from '@/theme/theme';

// Choix caméra/galerie identique à celui déjà utilisé pour la photo élève
// depuis la fiche Direction/Parent (mêmes réglages ImagePicker), simplement
// précédé d'un choix de source ici.
async function pickPhoto(source: 'camera' | 'library') {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [3, 4] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [3, 4] });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0];
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  DIRECTION: 'Direction',
  ENSEIGNANT: 'Enseignant',
  SURVEILLANT: 'Surveillant',
  PARENT: 'Parent',
  ELEVE: 'Élève',
};

export function ProfileScreen() {
  const theme = useTheme();
  const database = useOptionalDatabase();
  const logout = useLogout();
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);

  const isEleve = role === 'ELEVE';
  const myStudent = useMyStudent({ enabled: isEleve });
  const { mutate: uploadPhoto, isPending: isUploadingPhoto } = useUploadStudentPhoto(studentId ?? '');

  useEffect(() => {
    let isCancelled = false;

    getDecodedAccessToken().then(async (payload) => {
      if (isCancelled || !payload) return;
      setUsername(payload.username);
      setRole(payload.role);
      setStudentId(payload.studentId);

      if (!database || !payload.schoolId) return;
      const school = await database
        .get<School>('schools')
        .find(payload.schoolId)
        .catch(() => null);
      if (!isCancelled && school) setSchoolName(school.name);
    });

    return () => {
      isCancelled = true;
    };
  }, [database]);

  function handleChoosePhotoSource() {
    Alert.alert('Ma photo', 'Comment veux-tu ajouter ta photo ?', [
      { text: 'Prendre une photo', onPress: () => void handlePickPhoto('camera') },
      { text: 'Choisir dans la galerie', onPress: () => void handlePickPhoto('library') },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  async function handlePickPhoto(source: 'camera' | 'library') {
    const asset = await pickPhoto(source);
    if (!asset) return;

    uploadPhoto(
      { uri: asset.uri, fileName: asset.fileName ?? 'photo.jpg', mimeType: asset.mimeType ?? 'image/jpeg' },
      { onError: () => Alert.alert('Erreur', "Impossible d'envoyer la photo. Réessaie.") },
    );
  }

  return (
    <Screen style={styles.container}>
      <ScreenHeader title="Profil" />

      {isEleve && (
        <Card style={styles.card}>
          <ThemedText type="smallBold">Ma photo</ThemedText>
          <View style={styles.photoRow}>
            {myStudent.data?.photoUrl ? (
              <Image source={{ uri: resolveApiUrl(myStudent.data.photoUrl) }} style={styles.photo} />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: theme.backgroundSelected }]}>
                <Ionicons name="person-outline" size={28} color={theme.textSecondary} />
              </View>
            )}
            <Button
              label={myStudent.data?.photoUrl ? 'Changer ma photo' : 'Ajouter ma photo'}
              icon="camera-outline"
              variant="tonal"
              onPress={handleChoosePhotoSource}
              loading={isUploadingPhoto}
            />
          </View>
        </Card>
      )}

      <Card style={styles.card}>
        <ProfileRow label="Identifiant" value={username ?? '—'} />
        <ProfileRow label="Rôle" value={role ? (ROLE_LABELS[role] ?? role) : '—'} />
        <ProfileRow label="École" value={schoolName ?? '—'} />
      </Card>

      <Button label="Déconnexion" variant="danger" icon="log-out-outline" onPress={logout} />
    </Screen>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  card: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: Radius.large,
  },
  photoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: Radius.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
