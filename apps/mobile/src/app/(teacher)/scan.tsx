import { useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Q } from '@nozbe/watermelondb';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { ScanFeedbackBanner, type ScanFeedback } from '@/features/attendance/components/ScanFeedbackBanner';
import { useRecordAttendance } from '@/features/attendance/hooks/useRecordAttendance';
import type { Checkpoint } from '@/db/models/AttendanceRecord';
import { SyncStatusBadge } from '@/features/sync/components/SyncStatusBadge';
import { parseCardQrCode } from '@/services/qrVerify';

// Le même QR peut rester dans le champ de la caméra pendant plusieurs frames :
// on ignore les scans répétés de la même carte pendant ce délai.
const RESCAN_COOLDOWN_MS = 4000;

export default function ScanScreen() {
  const database = useOptionalDatabase();
  const recordAttendance = useRecordAttendance();
  const [permission, requestPermission] = useCameraPermissions();
  const [checkpoint, setCheckpoint] = useState<Checkpoint>('portail');
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const lastScan = useRef<{ cardId: string; at: number } | null>(null);

  if (!database) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>
          Le scan de présence nécessite la base locale WatermelonDB, indisponible dans Expo Go.
          Lance l'app via un dev client (npx expo run:android ou EAS Build) pour tester cet écran.
        </ThemedText>
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

    // La vérification de signature Ed25519 (offline, via la clé publique de
    // l'école) est branchée dans qrVerify.verifyCardSignature — omise ici en
    // attendant la distribution de la clé publique depuis le backend.
    const isRevoked = (await database.get('revoked_cards').query(Q.where('card_id', cardId)).fetchCount()) > 0;

    if (isRevoked) {
      setFeedback({ status: 'revoked' });
      return;
    }

    try {
      const record = await recordAttendance(studentId, checkpoint);
      setFeedback({ status: 'ok', isLate: record.isLate });
    } catch {
      setFeedback({ status: 'erreur' });
    }
  }

  if (!permission) {
    return <ThemedView style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>
          L'accès à la caméra est nécessaire pour scanner les cartes élèves.
        </ThemedText>
        <ThemedText type="linkPrimary" onPress={requestPermission}>
          Autoriser la caméra
        </ThemedText>
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

      <ThemedView type="backgroundElement" style={styles.checkpointSwitch}>
        {(['portail', 'classe'] as const).map((option) => (
          <Pressable
            key={option}
            style={[styles.checkpointOption, checkpoint === option && styles.checkpointOptionActive]}
            onPress={() => setCheckpoint(option)}
          >
            <ThemedText type="smallBold">{option === 'portail' ? 'Portail' : 'Salle de classe'}</ThemedText>
          </Pressable>
        ))}
      </ThemedView>

      <SyncStatusBadge />
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
  message: {
    textAlign: 'center',
    margin: 24,
  },
  checkpointSwitch: {
    position: 'absolute',
    top: 48,
    left: 24,
    right: 24,
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
  checkpointOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  checkpointOptionActive: {
    backgroundColor: '#208AEF',
  },
});
