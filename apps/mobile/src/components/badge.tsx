import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme/theme';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

const NEUTRAL_COLOR = '#4B5563';

/**
 * Pastille de statut unique — remplace `lateBadge`/`countBadge` (dashboard)
 * et les couleurs codées à la main dans ScanFeedbackBanner.
 */
export function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  const theme = useTheme();
  const color = tone === 'neutral' ? NEUTRAL_COLOR : theme[tone];

  return (
    <ThemedView style={[styles.badge, { backgroundColor: color }]}>
      <ThemedText type="small" style={styles.label}>
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  label: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
