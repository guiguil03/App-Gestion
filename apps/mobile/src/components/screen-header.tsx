import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/theme/theme';

export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Ex. bouton "+" d'ajout — aligné à droite du titre. */
  action?: ReactNode;
};

/**
 * En-tête de page standard — remplace le couple `ThemedText type="title"` +
 * style local `{fontSize: 24}` recopié dans quasiment tous les écrans.
 */
export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <ThemedText type="title">{title}</ThemedText>
        {subtitle && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  texts: {
    flex: 1,
    gap: Spacing.half,
  },
  subtitle: {
    textTransform: 'capitalize',
  },
});
