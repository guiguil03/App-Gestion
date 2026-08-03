import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useTheme } from '@/hooks/use-theme';
import { Buffer } from 'buffer';

import { ScanFeedbackBanner, type ScanFeedback } from '@/features/attendance/components/ScanFeedbackBanner';
import { ScanFrameOverlay } from '@/features/attendance/components/ScanFrameOverlay';
import { useCurrentLocation } from '@/features/attendance/hooks/useCurrentLocation';
import { GeofenceRejectionError, useRecordAttendance } from '@/features/attendance/hooks/useRecordAttendance';
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
  const currentLocation = useCurrentLocation();
  const [permission, requestPermission] = useCameraPermissions();
  const [checkpoint, setCheckpoint] = useState<Checkpoint>('portail');
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const lastScan = useRef<{ cardId: string; at: number } | null>(null);

  if (!database) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.centerContent}>
          <Ionicons name="server-outline" size={40} color={theme.textSecondary} />
          <ThemedText type="subtitle" style={styles.messageTitle}>
            Base locale indisponible
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            Le scan de présence nécessite la base locale WatermelonDB, indisponible dans Expo Go. Lance l'app via un
            dev client (npx expo run:android ou EAS Build) pour tester cet écran.
          </ThemedText>
        </ThemedView>
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
      const record = await recordAttendance(studentId, checkpoint, currentLocation.current);
      setFeedback({ status: 'ok', isLate: record.isLate });
    } catch (error) {
      if (error instanceof GeofenceRejectionError) {
        setFeedback({ status: error.reason });
      } else {
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
        <ThemedView style={styles.centerContent}>
          <Ionicons name="camera-outline" size={40} color={theme.textSecondary} />
          <ThemedText type="subtitle" style={styles.messageTitle}>
            Accès caméra requis
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            L'accès à la caméra est nécessaire pour scanner les cartes élèves.
          </ThemedText>
          <Pressable style={[styles.permissionButton, { backgroundColor: theme.primary }]} onPress={requestPermission}>
            <ThemedText type="smallBold" style={styles.permissionButtonLabel}>
              Autoriser la caméra
            </ThemedText>
          </Pressable>
        </ThemedView>
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

      <View style={styles.topBar}>
        <ThemedView style={styles.checkpointSwitch}>
          {(['portail', 'classe'] as const).map((option) => (
            <Pressable
              key={option}
              style={[styles.checkpointOption, checkpoint === option && { backgroundColor: theme.primary }]}
              onPress={() => setCheckpoint(option)}
            >
              <ThemedText type="smallBold" style={checkpoint === option ? styles.checkpointLabelActive : undefined}>
                {option === 'portail' ? 'Portail' : 'Salle de classe'}
              </ThemedText>
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
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  messageTitle: {
    marginTop: 8,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  permissionButtonLabel: {
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 14,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  checkpointOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  checkpointLabelActive: {
    color: '#FFFFFF',
  },
});
