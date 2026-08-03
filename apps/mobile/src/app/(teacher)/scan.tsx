import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useTheme } from '@/hooks/use-theme';
import { Elevation, Radius, Spacing } from '@/theme/theme';
import { Buffer } from 'buffer';

import { ScanFeedbackBanner, type ScanFeedback } from '@/features/attendance/components/ScanFeedbackBanner';
import { ScanFrameOverlay } from '@/features/attendance/components/ScanFrameOverlay';
import { useCurrentLocation } from '@/features/attendance/hooks/useCurrentLocation';
import { GeofenceRejectionError, useRecordAttendance } from '@/features/attendance/hooks/useRecordAttendance';
import type { Checkpoint } from '@/db/models/AttendanceRecord';
import RevokedCard from '@/db/models/RevokedCard';
import School from '@/db/models/School';
import { SyncStatusBadge } from '@/features/sync/components/SyncStatusBadge';
import { parseCardQrCode, verifyCardSignature } from '@/services/qrVerify';

// Le même QR peut rester dans le champ de la caméra pendant plusieurs frames :
// on ignore les scans répétés de la même carte pendant ce délai.
const RESCAN_COOLDOWN_MS = 4000;

// Hauteur approx. du switch checkpoint (padding + contenu) — utilisée pour
// placer le badge de sync juste en dessous, sans le faire dépendre du layout
// réel (mesure DOM) pour un élément purement décoratif.
const CHECKPOINT_SWITCH_HEIGHT = 52;

export default function ScanScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const database = useOptionalDatabase();
  const recordAttendance = useRecordAttendance();
  const currentLocation = useCurrentLocation();
  const [permission, requestPermission] = useCameraPermissions();
  const [checkpoint, setCheckpoint] = useState<Checkpoint>('portail');
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const lastScan = useRef<{ cardId: string; at: number } | null>(null);

  if (!database) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState
          icon="server-outline"
          title="Base locale indisponible"
          description="Le scan de présence nécessite la base locale WatermelonDB, indisponible dans Expo Go. Lance l'app via un dev client (npx expo run:android ou EAS Build) pour tester cet écran."
        />
      </ThemedView>
    );
  }

  async function handleScan({ data }: { data: string }) {
    if (!database) return; // ne devrait pas arriver : cf. le early-return ci-dessus

    const parsed = parseCardQrCode(data);
    if (!parsed) {
      setFeedback({ status: 'invalide' });
      return;
    }

    const { cardId, studentId } = parsed.payload;
    const now = Date.now();
    if (lastScan.current?.cardId === cardId && now - lastScan.current.at < RESCAN_COOLDOWN_MS) {
      return;
    }
    lastScan.current = { cardId, at: now };

    try {
      // La clé publique de l'école n'est présente localement que pour l'école
      // du compte connecté (le pull est scopé par tenant) : si payload.schoolId
      // ne correspond pas à cette école, la recherche échoue et la carte est
      // traitée comme non authentique.
      const schools = await database.get<School>('schools').query(Q.where('id', parsed.payload.schoolId)).fetch();
      const school = schools[0];
      if (!school?.cardSigningPublicKey) {
        setFeedback({ status: 'falsifiee' });
        return;
      }

      const publicKeyBytes = new Uint8Array(Buffer.from(school.cardSigningPublicKey, 'hex'));
      const isAuthentic = await verifyCardSignature(parsed, publicKeyBytes);
      if (!isAuthentic) {
        setFeedback({ status: 'falsifiee' });
        return;
      }

      const isRevoked =
        (await database.get<RevokedCard>('revoked_cards').query(Q.where('card_id', cardId)).fetchCount()) > 0;

      if (isRevoked) {
        setFeedback({ status: 'revoked' });
        return;
      }

      const record = await recordAttendance(studentId, checkpoint, currentLocation.current);
      setFeedback({ status: 'ok', isLate: record.isLate });
    } catch (error) {
      if (error instanceof GeofenceRejectionError) {
        setFeedback({ status: error.reason });
      } else {
        // Toute exception ici (école introuvable, clé publique corrompue,
        // signature malformée, DB indisponible...) doit rester visible à
        // l'écran — un scan qui échoue silencieusement est indiscernable
        // d'un scan qui n'a jamais été détecté par la caméra.
        console.error('[scan] échec du traitement de la carte', error);
        setFeedback({ status: 'erreur' });
      }
    }
  }

  if (!permission) {
    return <ThemedView style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState
          icon="camera-outline"
          title="Accès caméra requis"
          description="L'accès à la caméra est nécessaire pour scanner les cartes élèves."
          action={<Button label="Autoriser la caméra" onPress={requestPermission} />}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScan}
      />
      <ScanFrameOverlay instruction="Cadre la carte élève à scanner" />

      <View style={[styles.topBar, { top: insets.top + Spacing.two }]}>
        <ThemedView style={styles.checkpointSwitch}>
          {(['portail', 'classe'] as const).map((option) => (
            <Pressable
              key={option}
              style={[styles.checkpointOption, checkpoint === option && { backgroundColor: theme.active }]}
              onPress={() => setCheckpoint(option)}
            >
              <ThemedText
                type="smallBold"
                style={checkpoint === option ? { color: theme.activeText } : undefined}
              >
                {option === 'portail' ? 'Portail' : 'Salle de classe'}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      </View>

      <SyncStatusBadge topOffset={CHECKPOINT_SWITCH_HEIGHT + Spacing.two} />

      <View style={styles.noCardButton}>
        <Button
          label="Élève sans carte"
          variant="tonal"
          icon="person-add-outline"
          onPress={() => router.push({ pathname: '/(teacher)/pointage-manuel', params: { checkpoint } })}
        />
      </View>

      <ScanFeedbackBanner feedback={feedback} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
  checkpointSwitch: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: Radius.large,
    padding: Spacing.one,
    ...Elevation.level2,
  },
  checkpointOption: {
    flex: 1,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.medium,
    alignItems: 'center',
  },
  // Au-dessus du bandeau de feedback (bottom: 40, ~56px de haut) — assez
  // d'écart pour ne jamais se chevaucher, y compris avec le texte le plus long.
  noCardButton: {
    position: 'absolute',
    bottom: 110,
    left: Spacing.four,
    right: Spacing.four,
  },
});
