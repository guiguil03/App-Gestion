import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Q } from '@nozbe/watermelondb';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useTheme } from '@/hooks/use-theme';
import { Buffer } from 'buffer';

import { ScanFeedbackBanner, type ScanFeedback } from '@/features/attendance/components/ScanFeedbackBanner';
import { useRecordAttendance } from '@/features/attendance/hooks/useRecordAttendance';
import type { Checkpoint } from '@/db/models/AttendanceRecord';
import School from '@/db/models/School';
import { SyncStatusBadge } from '@/features/sync/components/SyncStatusBadge';
import { parseCardQrCode, verifyCardSignature } from '@/services/qrVerify';

// Le même QR peut rester dans le champ de la caméra pendant plusieurs frames :
// on ignore les scans répétés de la même carte pendant ce délai.
const RESCAN_COOLDOWN_MS = 4000;

export default function ScanScreen() {
  const theme = useTheme();
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

      <View style={styles.topBar}>
        <ThemedView type="backgroundElement" style={styles.checkpointSwitch}>
          {(['portail', 'classe'] as const).map((option) => (
            <Pressable
              key={option}
              style={[styles.checkpointOption, checkpoint === option && { backgroundColor: theme.primary }]}
              onPress={() => setCheckpoint(option)}
            >
              <ThemedText type="smallBold">{option === 'portail' ? 'Portail' : 'Salle de classe'}</ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      </View>

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
  topBar: {
    position: 'absolute',
    top: 48,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkpointSwitch: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
  checkpointOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
});
