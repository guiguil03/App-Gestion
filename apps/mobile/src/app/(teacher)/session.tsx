// apps/mobile/src/app/(teacher)/session.tsx
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import AttendanceSession from '@/db/models/AttendanceSession';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useSelectedClass } from '@/features/classes/SelectedClassContext';
import { useSyncStatus } from '@/features/sync/SyncStatusProvider';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme/theme';
import { getDecodedAccessToken } from '@/services/secureStorage';
import { signSessionPayload } from '@/services/sessionSigning';

// Durée par défaut d'une session avant expiration automatique — l'enseignant
// peut aussi la fermer manuellement plus tôt via le bouton dédié.
const SESSION_DURATION_MS = 15 * 60 * 1000;

export default function SessionScreen() {
  const theme = useTheme();
  const database = useOptionalDatabase();
  const { triggerSync } = useSyncStatus();
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
        // Le QR s'affiche tout de suite, mais la session ne devient visible
        // au push d'un élève que le serveur ait déjà reçu ce sync — sans ce
        // déclenchement immédiat (même logique que useRecordAttendance.ts),
        // un élève scannant pendant les premières secondes se ferait
        // rejeter avec "Session de présence introuvable" en attendant le
        // prochain sync automatique (jusqu'à 5 min).
        triggerSync();

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
  }, [database, classId, triggerSync]);

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
    triggerSync();
    router.back();
  }

  if (!database) {
    return (
      <Screen style={styles.container}>
        <ThemedText style={styles.message}>
          Cet écran nécessite la base locale WatermelonDB, indisponible dans Expo Go.
        </ThemedText>
      </Screen>
    );
  }

  if (!classId) {
    return (
      <Screen style={styles.container}>
        <ThemedText style={styles.message}>Aucune classe sélectionnée.</ThemedText>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen style={styles.container}>
        <ThemedText style={[styles.message, { color: theme.danger }]}>{error}</ThemedText>
        <ThemedText type="linkPrimary" onPress={() => router.back()}>
          Retour
        </ThemedText>
      </Screen>
    );
  }

  const minutes = String(Math.floor(remainingMs / 60_000)).padStart(2, '0');
  const seconds = String(Math.floor((remainingMs % 60_000) / 1000)).padStart(2, '0');

  return (
    <Screen style={styles.container}>
      <ThemedText type="title">Session en cours</ThemedText>
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

      <View style={styles.closeButtonWrapper}>
        <Button label="Fermer la session" variant="danger" onPress={closeSession} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
    margin: Spacing.four,
  },
  qrWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonWrapper: {
    alignSelf: 'stretch',
    marginBottom: Spacing.four,
  },
});
