import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme/theme';

export type ListRowProps = {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  /** Affiche un chevron et rend la ligne pressable si fourni. */
  onPress?: () => void;
};

/**
 * Ligne de liste standard (avatar + titre/sous-titre + accessoire) —
 * remplace le pattern recopié dans dashboard (derniers scans), eleves,
 * classe et children, chacun avec sa propre variante de styles.
 */
export function ListRow({ leading, title, subtitle, trailing, onPress }: ListRowProps) {
  const theme = useTheme();

  const content = (
    <Card style={styles.row}>
      {leading}
      <View style={styles.content}>
        <ThemedText type="smallBold">{title}</ThemedText>
        {subtitle && (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        )}
      </View>
      {trailing}
      {onPress && <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />}
    </Card>
  );

  if (!onPress) return content;
  return <Pressable onPress={onPress}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  content: {
    flex: 1,
    gap: Spacing.half,
  },
});
