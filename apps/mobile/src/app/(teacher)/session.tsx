// apps/mobile/src/app/(teacher)/session.tsx
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import AttendanceSession from '@/db/models/AttendanceSession';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useSelectedClass } from '@/features/classes/SelectedClassContext';
import { useTheme } from '@/hooks/use-theme';
import { getDecodedAccessToken } from '@/services/secureStorage';
import { signSessionPayload } from '@/services/sessionSigning';

// Durée par défaut d'une session avant expiration automatique — l'enseignant
// peut aussi la fermer manuellement plus tôt via le bouton dédié.
const SESSION_DURATION_MS = 15 * 60 * 1000;

export default function SessionScreen() {
  const theme = useTheme();
  const database = useOptionalDatabase();
  const { selectedClassId: classId } = useSelectedClass();
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(SESSION_DURATION_MS);
  const closingRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;

    async function openSession() {
      if (!database || !classId) return;

      try {
        const token = await getDecodedAccessToken();
        if (!token?.schoolId) {
          if (!isCancelled) setError('Session de connexion invalide — reconnecte-toi.');
          return;
        }

        const openedAt = Date.now();
        const expiresAt = openedAt + SESSION_DURATION_MS;

        const record = await database.write(() =>
          database.get<AttendanceSession>('attendance_sessions').create((s) => {
            s.schoolClassId = classId;
            s.teacherId = token.userId;
            s.openedAt = new Date(openedAt);
            s.expiresAt = new Date(expiresAt);
          }),
        );
        if (isCancelled) return;
        setSession(record);

        const { qrCode: signed } = await signSessionPayload({
          sessionId: record.id,
          schoolId: token.schoolId,
          schoolClassId: classId,
          teacherId: token.userId,
          openedAt,
          expiresAt,
        });
        if (!isCancelled) setQrCode(signed);
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Erreur inconnue lors de la création de la session.');
        }
      }
    }

    openSession();
    return () => {
      isCancelled = true;
    };
  }, [database, classId]);

  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      const remaining = session.expiresAt.getTime() - Date.now();
      setRemainingMs(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(interval);
        router.back();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  async function closeSession() {
    if (!database || !session || closingRef.current) return;
    closingRef.current = true;
    await database.write(() =>
      session.update((s) => {
        s.closedAt = new Date();
      }),
    );
    router.back();
  }

  if (!database) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>
          Cet écran nécessite la base locale WatermelonDB, indisponible dans Expo Go.
        </ThemedText>
      </ThemedView>
    );
  }

  if (!classId) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>Aucune classe sélectionnée.</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={[styles.message, { color: theme.danger }]}>{error}</ThemedText>
        <ThemedText type="linkPrimary" onPress={() => router.back()}>
          Retour
        </ThemedText>
      </ThemedView>
    );
  }

  const minutes = String(Math.floor(remainingMs / 60_000)).padStart(2, '0');
  const seconds = String(Math.floor((remainingMs % 60_000) / 1000)).padStart(2, '0');

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Session en cours
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        Les élèves scannent ce QR pour valider leur présence — expire dans {minutes}:{seconds}
      </ThemedText>

      <View style={styles.qrWrapper}>
        {qrCode ? (
          <QRCode value={qrCode} size={260} />
        ) : (
          <ThemedText themeColor="textSecondary">Génération du QR…</ThemedText>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [styles.closeButton, { backgroundColor: theme.danger }, pressed && styles.pressed]}
        onPress={closeSession}
      >
        <ThemedText style={styles.closeLabel}>Fermer la session</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
  },
  message: {
    textAlign: 'center',
    margin: 24,
  },
  qrWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    alignSelf: 'stretch',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  pressed: {
    opacity: 0.85,
  },
  closeLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
