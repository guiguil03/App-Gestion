import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export type ScanFeedback =
  | { status: 'ok'; isLate: boolean }
  | { status: 'revoked' }
  | { status: 'invalide' }
  | { status: 'falsifiee' }
  | { status: 'erreur' };

const SUCCESS_COLOR = '#16A34A';
const WARNING_COLOR = '#F59E0B';
const DANGER_COLOR = '#DC2626';
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
  }
}

function iconFor(feedback: ScanFeedback): string {
  switch (feedback.status) {
    case 'ok':
      return feedback.isLate ? '⏱' : '✓';
    case 'revoked':
    case 'falsifiee':
      return '⛔';
    case 'invalide':
      return '?';
    case 'erreur':
      return '!';
  }
}

function colorFor(feedback: ScanFeedback): string {
  switch (feedback.status) {
    case 'ok':
      return feedback.isLate ? WARNING_COLOR : SUCCESS_COLOR;
    case 'revoked':
    case 'falsifiee':
      return DANGER_COLOR;
    case 'invalide':
      return NEUTRAL_COLOR;
    case 'erreur':
      return DANGER_COLOR;
  }
}

export function ScanFeedbackBanner({ feedback }: { feedback: ScanFeedback | null }) {
  if (!feedback) return null;

  const color = colorFor(feedback);

  return (
    <ThemedView style={[styles.feedback, { backgroundColor: color }]}>
      <ThemedText style={styles.icon}>{iconFor(feedback)}</ThemedText>
      <ThemedText type="smallBold" style={styles.label}>
        {labelFor(feedback)}
      </ThemedText>
    </ThemedView>
  );
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
  icon: {
    fontSize: 18,
    color: '#ffffff',
  },
  label: {
    color: '#ffffff',
    textAlign: 'center',
  },
});
