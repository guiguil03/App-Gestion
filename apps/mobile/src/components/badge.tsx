import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, withOpacity } from '@/theme/theme';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

const NEUTRAL_COLOR = '#71717A';

/**
 * Pastille de statut en teinte pastel (fond clair + texte plein), comme les
 * badges "Temps réel actif" / KPI du dashboard — pas de fond plein coloré.
 */
export function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  const theme = useTheme();
  const color = tone === 'neutral' ? NEUTRAL_COLOR : theme[tone];

  return (
    <ThemedView style={[styles.badge, { backgroundColor: withOpacity(color, '1A') }]}>
      <ThemedText type="small" style={[styles.label, { color }]}>
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
    fontWeight: '700',
  },
});
