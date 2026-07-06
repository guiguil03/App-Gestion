import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useDatabase } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { parseCardQrCode } from '@/services/qrVerify';

type ScanFeedback = { studentId: string; status: 'ok' | 'revoked' | 'invalide' } | null;

export default function ScanScreen() {
  const database = useDatabase();
  const [permission, requestPermission] = useCameraPermissions();
  const [feedback, setFeedback] = useState<ScanFeedback>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleScan({ data }: { data: string }) {
    if (isProcessing) return;
    setIsProcessing(true);

    const parsed = parseCardQrCode(data);
    if (!parsed) {
      setFeedback({ studentId: '', status: 'invalide' });
      setIsProcessing(false);
      return;
    }

    // La vérification de signature Ed25519 (offline, via la clé publique de
    // l'école) est branchée dans qrVerify.verifyCardSignature — omise ici en
    // attendant la distribution de la clé publique depuis le backend.
    const revoked = await database
      .get('revoked_cards')
      .query(Q.where('card_id', parsed.payload.cardId))
      .fetchCount();

    setFeedback({
      studentId: parsed.payload.studentId,
      status: revoked > 0 ? 'revoked' : 'ok',
    });
    setIsProcessing(false);
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
        onBarcodeScanned={isProcessing ? undefined : handleScan}
      />
      {feedback ? (
        <ThemedText type="subtitle" style={styles.feedback}>
          {feedback.status === 'ok' && 'Pointage enregistré ✓'}
          {feedback.status === 'revoked' && 'Carte révoquée — refuser'}
          {feedback.status === 'invalide' && 'QR code illisible'}
        </ThemedText>
      ) : null}
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
  feedback: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    textAlign: 'center',
  },
});
