// apps/mobile/src/app/(student)/carte.tsx
import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import QRCodeView from 'react-native-qrcode-svg';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import School from '@/db/models/School';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { Radius, Spacing } from '@/theme/theme';
import { resolveApiUrl } from '@/api/client';
import { getStudentErrorMessage } from '@/features/students/errorMessage';
import { useMyStudentCard } from '@/features/students/hooks/useStudentCard';
import { useMyStudent } from '@/features/students/hooks/useStudents';
import { buildCardHtml } from '@/services/cardHtml';
import { buildQrCodeSvg } from '@/services/qrSvg';

export default function StudentCarteScreen() {
  const database = useOptionalDatabase();
  const { data: student, isLoading: studentLoading, isError, error } = useMyStudent();
  const { data: cardResult, isLoading: cardLoading } = useMyStudentCard();
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!database || !student?.schoolId) return;
    database
      .get<School>('schools')
      .find(student.schoolId)
      .then((school) => setSchoolName(school.name))
      .catch(() => setSchoolName(null));
  }, [database, student?.schoolId]);

  if (studentLoading || cardLoading) {
    return <Screen />;
  }

  if (isError || !student) {
    return (
      <Screen>
        <EmptyState
          icon="alert-circle-outline"
          title="Impossible de charger ta fiche"
          description={isError ? getStudentErrorMessage(error) : undefined}
        />
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
      Alert.alert('Erreur', "Impossible de générer la carte à exporter.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Ma carte" />

      <Card style={styles.card} elevation="level2">
        {student.photoUrl && <Image source={{ uri: resolveApiUrl(student.photoUrl) }} style={styles.photo} />}

        <View style={styles.cardInfo}>
          <ThemedText type="smallBold">
            {student.lastName} {student.firstName}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {schoolName ?? '—'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {student.schoolClass.name} · {student.schoolClass.promotion}
          </ThemedText>
        </View>

        {cardResult ? (
          <QRCodeView value={cardResult.qrCode} size={220} />
        ) : (
          <ThemedText type="small" themeColor="textSecondary" style={styles.noCardMessage}>
            Aucune carte n'a encore été émise — contacte l'administration.
          </ThemedText>
        )}
      </Card>

      {cardResult && (
        <Button
          label={isExporting ? 'Génération…' : 'Exporter ma carte (PDF)'}
          icon="download-outline"
          variant="tonal"
          onPress={handleExport}
          disabled={isExporting}
        />
      )}

      <Card style={styles.section}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Mes informations
        </ThemedText>
        <InfoRow label="Post-nom" value={student.middleName ?? '—'} />
        <InfoRow label="Sexe" value={student.sex === 'F' ? 'Féminin' : 'Masculin'} />
        <InfoRow label="Date de naissance" value={student.dateOfBirth} />
      </Card>

        {student.parents[0] && (
          <Card style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              Parent / tuteur
            </ThemedText>
            <InfoRow label="Nom complet" value={student.parents[0].fullName} />
            <InfoRow label="Lien de parenté" value={student.parents[0].relationship} />
            <InfoRow label="Téléphone" value={student.parents[0].phoneNumber} />
            {student.parents[0].secondaryPhoneNumber && (
              <InfoRow label="Téléphone secondaire" value={student.parents[0].secondaryPhoneNumber} />
            )}
            {student.parents[0].address && <InfoRow label="Adresse" value={student.parents[0].address} />}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    gap: 0,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six - Spacing.two,
    gap: Spacing.three,
  },
  card: {
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
  noCardMessage: {
    textAlign: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    marginBottom: Spacing.half,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
