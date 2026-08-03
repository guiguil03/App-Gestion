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
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { resolveApiUrl } from '@/api/client';
import { Radius, Spacing } from '@/theme/theme';
import { getStudentErrorMessage } from '@/features/students/errorMessage';
import { useStudent } from '@/features/students/hooks/useStudents';
import { useIssueStudentCard, useStudentCard } from '@/features/students/hooks/useStudentCard';
import { buildCardHtml } from '@/services/cardHtml';
import { buildQrCodeSvg } from '@/services/qrSvg';

export default function EleveCarteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: student, isLoading: studentLoading, isError, error } = useStudent(id ?? null);
  const { data: cardResult, isLoading: cardLoading } = useStudentCard(id ?? null);
  const { mutate: issueCard, isPending: isIssuing } = useIssueStudentCard(id as string);
  const [isExporting, setIsExporting] = useState(false);

  if (isError) {
    return (
      <Screen>
        <BackButton />
        <EmptyState icon="alert-circle-outline" title="Erreur" description={getStudentErrorMessage(error)} />
      </Screen>
    );
  }

  if (studentLoading || cardLoading || !student) {
    return (
      <Screen>
        <BackButton />
      </Screen>
    );
  }

  async function handleExport() {
    if (!student || !cardResult) return;
    setIsExporting(true);
    try {
      const qrSvg = buildQrCodeSvg(cardResult.qrCode, 130);
      const html = buildCardHtml({
        fullName: `${student.lastName} ${student.firstName}`,
        className: student.schoolClass.name,
        promotion: student.schoolClass.promotion,
        dateOfBirth: student.dateOfBirth,
        sex: student.sex,
        photoUrl: student.photoUrl ? resolveApiUrl(student.photoUrl) : null,
        qrSvg,
        cardId: cardResult.card.id,
        issuedAt: cardResult.card.issuedAt,
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
    <Screen>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
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
