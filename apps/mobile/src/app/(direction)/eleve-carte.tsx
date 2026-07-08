// apps/mobile/src/app/(direction)/eleve-carte.tsx
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import QRCodeView from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { resolveApiUrl } from '@/api/client';
import { useTheme } from '@/hooks/use-theme';
import { useStudent } from '@/features/students/hooks/useStudents';
import { useIssueStudentCard, useStudentCard } from '@/features/students/hooks/useStudentCard';
import { buildQrCodeSvg } from '@/services/qrSvg';

export default function EleveCarteScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: student, isLoading: studentLoading } = useStudent(id ?? null);
  const { data: cardResult, isLoading: cardLoading } = useStudentCard(id ?? null);
  const { mutate: issueCard, isPending: isIssuing } = useIssueStudentCard(id as string);
  const [isExporting, setIsExporting] = useState(false);

  if (studentLoading || cardLoading || !student) {
    return <ThemedView style={styles.container} />;
  }

  async function handleExport() {
    if (!student || !cardResult) return;
    setIsExporting(true);
    try {
      const qrSvg = buildQrCodeSvg(cardResult.qrCode, 200);
      const html = buildCardHtml({
        fullName: `${student.lastName} ${student.firstName}`,
        className: student.schoolClass.name,
        promotion: student.schoolClass.promotion,
        photoUrl: student.photoUrl ? resolveApiUrl(student.photoUrl) : null,
        qrSvg,
      });
      const { uri } = await Print.printToFileAsync({ html, width: 243, height: 153 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
    } catch {
      Alert.alert('Erreur', "Impossible de générer la carte à imprimer.");
    } finally {
      setIsExporting(false);
    }
  }

  function handleIssue() {
    issueCard(undefined, {
      onError: () => Alert.alert('Erreur', "Impossible d'émettre la carte."),
    });
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Carte élève
      </ThemedText>

      <View style={styles.card}>
        <ThemedView type="backgroundElement" bordered style={styles.cardInner}>
          {student.photoUrl && <Image source={{ uri: resolveApiUrl(student.photoUrl) }} style={styles.photo} />}

          <View style={styles.cardInfo}>
            <ThemedText type="smallBold">
              {student.lastName} {student.firstName}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {student.schoolClass.name} · {student.schoolClass.promotion}
            </ThemedText>
          </View>

          {cardResult ? (
            <QRCodeView value={cardResult.qrCode} size={200} />
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Aucune carte
            </ThemedText>
          )}
        </ThemedView>
      </View>

      {cardResult ? (
        <>
          <Pressable
            style={({ pressed }) => [styles.button, { backgroundColor: theme.primary }, pressed && styles.pressed]}
            onPress={handleExport}
            disabled={isExporting}
          >
            <ThemedText style={styles.buttonLabel}>
              {isExporting ? 'Génération…' : 'Imprimer / Exporter (PDF)'}
            </ThemedText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.button, { backgroundColor: theme.danger }, pressed && styles.pressed]}
            onPress={handleIssue}
            disabled={isIssuing}
          >
            <ThemedText style={styles.buttonLabel}>
              {isIssuing ? 'Génération…' : 'Perte/vol — réémettre une nouvelle carte'}
            </ThemedText>
          </Pressable>
        </>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.button, { backgroundColor: theme.primary }, pressed && styles.pressed]}
          onPress={handleIssue}
          disabled={isIssuing}
        >
          <ThemedText style={styles.buttonLabel}>{isIssuing ? 'Émission…' : 'Émettre la carte'}</ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

function buildCardHtml({
  fullName,
  className,
  promotion,
  photoUrl,
  qrSvg,
}: {
  fullName: string;
  className: string;
  promotion: string;
  photoUrl: string | null;
  qrSvg: string;
}): string {
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { margin: 0; }
          body { margin: 0; font-family: -apple-system, Helvetica, Arial, sans-serif; }
          .card {
            width: 243pt; height: 153pt; box-sizing: border-box; padding: 10pt;
            display: flex; flex-direction: row; align-items: center; gap: 10pt;
            border: 1pt solid #ccc; border-radius: 8pt;
          }
          .photo { width: 70pt; height: 90pt; object-fit: cover; border-radius: 4pt; background: #eee; }
          .info { flex: 1; }
          .name { font-size: 13pt; font-weight: 700; margin: 0 0 4pt; }
          .meta { font-size: 9pt; color: #555; margin: 0; }
          .qr { width: 90pt; height: 90pt; }
        </style>
      </head>
      <body>
        <div class="card">
          ${photoUrl ? `<img class="photo" src="${photoUrl}" />` : '<div class="photo"></div>'}
          <div class="info">
            <p class="name">${fullName}</p>
            <p class="meta">${className} — ${promotion}</p>
          </div>
          <div class="qr">${qrSvg}</div>
        </div>
      </body>
    </html>
  `;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
  },
  card: {
    alignItems: 'center',
  },
  cardInner: {
    width: '100%',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  photo: {
    width: 96,
    height: 120,
    borderRadius: 8,
  },
  cardInfo: {
    alignItems: 'center',
    gap: 2,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
