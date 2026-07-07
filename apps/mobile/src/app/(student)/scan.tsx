// apps/mobile/src/app/(student)/scan.tsx
import { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Q } from '@nozbe/watermelondb';
import { Buffer } from 'buffer';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import AttendanceRecord from '@/db/models/AttendanceRecord';
import School from '@/db/models/School';
import TeacherSigningKey from '@/db/models/TeacherSigningKey';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { ScanFeedbackBanner, type ScanFeedback } from '@/features/attendance/components/ScanFeedbackBanner';
import { SyncStatusBadge } from '@/features/sync/components/SyncStatusBadge';
import { getDecodedAccessToken } from '@/services/secureStorage';
import { parseSessionQrCode, verifySessionSignature } from '@/services/sessionQr';

// Le même QR peut rester dans le champ de la caméra pendant plusieurs frames :
// on ignore les scans répétés du même code pendant ce délai.
const RESCAN_COOLDOWN_MS = 4000;

export default function StudentScanScreen() {
  const database = useOptionalDatabase();
  const [permission, requestPermission] = useCameraPermissions();
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const lastScan = useRef<{ sessionId: string; at: number } | null>(null);

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
    if (!database) return; // ne devrait jamais arriver : cf. early-return ci-dessus

    const parsed = parseSessionQrCode(data);
    if (!parsed) {
      setFeedback({ status: 'invalide' });
      return;
    }

    const { sessionId, teacherId, schoolId, openedAt, expiresAt } = parsed.payload;
    const now = Date.now();
    if (lastScan.current?.sessionId === sessionId && now - lastScan.current.at < RESCAN_COOLDOWN_MS) {
      return;
    }
    lastScan.current = { sessionId, at: now };

    const token = await getDecodedAccessToken();
    if (!token?.studentId || token.schoolId !== schoolId) {
      setFeedback({ status: 'falsifiee' });
      return;
    }

    // La clé publique de l'enseignant n'est présente localement que si elle a
    // déjà été synchronisée (pull scopé à l'école du compte connecté) : si
    // absente, on ne peut pas vérifier la signature hors ligne.
    const keys = await database
      .get<TeacherSigningKey>('teacher_signing_keys')
      .query(Q.where('user_id', teacherId))
      .fetch();
    const teacherKey = keys[0];
    if (!teacherKey) {
      setFeedback({ status: 'falsifiee' });
      return;
    }

    const publicKeyBytes = new Uint8Array(Buffer.from(teacherKey.publicKey, 'hex'));
    const isAuthentic = await verifySessionSignature(parsed, publicKeyBytes);
    if (!isAuthentic) {
      setFeedback({ status: 'falsifiee' });
      return;
    }

    if (now > expiresAt) {
      setFeedback({ status: 'expiree' });
      return;
    }

    const alreadyScanned =
      (await database
        .get<AttendanceRecord>('attendance_records')
        .query(Q.where('session_id', sessionId), Q.where('student_id', token.studentId))
        .fetchCount()) > 0;
    if (alreadyScanned) {
      setFeedback({ status: 'deja_scanne' });
      return;
    }

    try {
      const school = await database.get<School>('schools').find(schoolId);
      const isLate = now > openedAt + school.attendanceToleranceMinutes * 60_000;

      await database.write(() =>
        database.get<AttendanceRecord>('attendance_records').create((record) => {
          record.studentId = token.studentId!;
          record.checkpoint = 'classe';
          record.direction = 'entree';
          record.recordedAt = new Date(now);
          record.isLate = isLate;
          record.sessionId = sessionId;
        }),
      );

      setFeedback({ status: 'ok', isLate });
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
          L'accès à la caméra est nécessaire pour scanner le QR de session affiché par l'enseignant.
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
});
