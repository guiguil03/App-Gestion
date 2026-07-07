import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export type ScanFeedback =
  | { status: 'ok'; isLate: boolean }
  | { status: 'revoked' }
  | { status: 'invalide' }
  | { status: 'falsifiee' }
  | { status: 'erreur' };

function labelFor(feedback: ScanFeedback): string {
  switch (feedback.status) {
    case 'ok':
      return feedback.isLate ? 'Pointage enregistré — en retard' : 'Pointage enregistré ✓';
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

export function ScanFeedbackBanner({ feedback }: { feedback: ScanFeedback | null }) {
  if (!feedback) return null;

  const label = labelFor(feedback);

  return (
    <ThemedText type="subtitle" style={styles.feedback}>
      {label}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  feedback: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    textAlign: 'center',
  },
});
