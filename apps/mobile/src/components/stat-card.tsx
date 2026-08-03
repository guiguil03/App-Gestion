import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/theme/theme';

export type StatCardProps = {
  label: string;
  value: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

/** Tuile statistique (icône + valeur + libellé) — généralisée depuis `SummaryStat` du dashboard enseignant. */
export function StatCard({ label, value, color, icon }: StatCardProps) {
  return (
    <Card style={styles.card}>
      <ThemedView style={[styles.icon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={16} color="#ffffff" />
      </ThemedView>
      <ThemedText type="title" style={[styles.value, { color }]}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  value: {
    fontSize: 26,
    lineHeight: 30,
  },
});
