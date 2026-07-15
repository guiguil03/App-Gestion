import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

export type ScanFeedback =
  | { status: 'ok'; isLate: boolean }
  | { status: 'revoked' }
  | { status: 'invalide' }
  | { status: 'falsifiee' }
  | { status: 'erreur' }
  | { status: 'expiree' }
  | { status: 'deja_scanne' }
  | { status: 'hors_perimetre' }
  | { status: 'hors_horaire' }
  | { status: 'position_indisponible' };

const NEUTRAL_COLOR = '#4B5563';

function labelFor(feedback: ScanFeedback): string {
  switch (feedback.status) {
    case 'ok':
      return feedback.isLate ? 'Pointage enregistré — en retard' : 'Pointage enregistré';
    case 'revoked':
      return 'Carte révoquée — refuser';
    case 'invalide':
      return 'QR code illisible';
    case 'falsifiee':
      return 'Carte non authentique — refuser';
    case 'erreur':
      return "Erreur d'enregistrement, réessayez";
    case 'expiree':
      return 'Session expirée — demande un nouveau QR';
    case 'deja_scanne':
      return 'Présence déjà enregistrée pour cette session';
    case 'hors_perimetre':
      return "Hors du périmètre de l'école — pointage refusé";
    case 'hors_horaire':
      return 'Hors des horaires de pointage autorisés';
    case 'position_indisponible':
      return 'Position GPS indisponible — active la localisation';
  }
}

function iconFor(feedback: ScanFeedback): keyof typeof Ionicons.glyphMap {
  switch (feedback.status) {
    case 'ok':
      return feedback.isLate ? 'time' : 'checkmark-circle';
    case 'revoked':
    case 'falsifiee':
      return 'close-circle';
    case 'invalide':
      return 'help-circle';
    case 'erreur':
      return 'alert-circle';
    case 'expiree':
      return 'time-outline';
    case 'deja_scanne':
      return 'checkmark-done-circle';
    case 'hors_perimetre':
      return 'location-outline';
    case 'hors_horaire':
      return 'time-outline';
    case 'position_indisponible':
      return 'locate-outline';
  }
}

export function ScanFeedbackBanner({ feedback }: { feedback: ScanFeedback | null }) {
  const theme = useTheme();
  if (!feedback) return null;

  const color = colorFor(feedback, theme);

  return (
    <ThemedView style={[styles.feedback, { backgroundColor: color }]}>
      <Ionicons name={iconFor(feedback)} size={20} color="#ffffff" />
      <ThemedText type="smallBold" style={styles.label}>
        {labelFor(feedback)}
      </ThemedText>
    </ThemedView>
  );
}

function colorFor(feedback: ScanFeedback, theme: { success: string; warning: string; danger: string }): string {
  switch (feedback.status) {
    case 'ok':
      return feedback.isLate ? theme.warning : theme.success;
    case 'revoked':
    case 'falsifiee':
      return theme.danger;
    case 'invalide':
      return NEUTRAL_COLOR;
    case 'erreur':
      return theme.danger;
    case 'expiree':
      return theme.warning;
    case 'deja_scanne':
      return NEUTRAL_COLOR;
    case 'hors_perimetre':
    case 'hors_horaire':
      return theme.danger;
    case 'position_indisponible':
      return NEUTRAL_COLOR;
  }
}

const styles = StyleSheet.create({
  feedback: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  label: {
    color: '#ffffff',
    textAlign: 'center',
  },
});
