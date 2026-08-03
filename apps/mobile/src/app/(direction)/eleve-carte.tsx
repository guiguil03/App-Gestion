// apps/mobile/src/app/(direction)/eleve-carte.tsx
import { useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import QRCodeView from 'react-native-qrcode-svg';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { resolveApiUrl } from '@/api/client';
import { Radius, Spacing } from '@/theme/theme';
import { getStudentErrorMessage } from '@/features/students/errorMessage';
import { useStudent } from '@/features/students/hooks/useStudents';
import { useIssueStudentCard, useStudentCard } from '@/features/students/hooks/useStudentCard';
import { buildQrCodeSvg } from '@/services/qrSvg';

export default function EleveCarteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: student, isLoading: studentLoading, isError, error } = useStudent(id ?? null);
  const { data: cardResult, isLoading: cardLoading } = useStudentCard(id ?? null);
  const { mutate: issueCard, isPending: isIssuing } = useIssueStudentCard(id as string);
  const [isExporting, setIsExporting] = useState(false);

  if (isError) {
    return (
      <ThemedView style={styles.container}>
        <BackButton />
        <EmptyState icon="alert-circle-outline" title="Erreur" description={getStudentErrorMessage(error)} />
      </ThemedView>
    );
  }

  if (studentLoading || cardLoading || !student) {
    return (
      <ThemedView style={styles.container}>
        <BackButton />
      </ThemedView>
    );
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
      <BackButton />
      <ThemedText type="title">Carte élève</ThemedText>

      <View style={styles.cardWrapper}>
        <Card style={styles.cardInner} elevation="level2">
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
        </Card>
      </View>

      {cardResult ? (
        <>
          <Button
            label={isExporting ? 'Génération…' : 'Imprimer / Exporter (PDF)'}
            onPress={handleExport}
            disabled={isExporting}
          />
          <Button
            label={isIssuing ? 'Génération…' : 'Perte/vol — réémettre une nouvelle carte'}
            variant="danger"
            onPress={handleIssue}
            disabled={isIssuing}
          />
        </>
      ) : (
        <Button label={isIssuing ? 'Émission…' : 'Émettre la carte'} onPress={handleIssue} disabled={isIssuing} />
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  cardWrapper: {
    alignItems: 'center',
  },
  cardInner: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.two,
  },
  photo: {
    width: 96,
    height: 120,
    borderRadius: Radius.small,
  },
  cardInfo: {
    alignItems: 'center',
    gap: Spacing.half,
  },
});
