import { StyleSheet, type ViewProps } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Elevation, Radius, Spacing } from '@/theme/theme';

export type CardProps = ViewProps & {
  /** `level1` = carte au repos (défaut) ; `level2` = élément flottant au-dessus du contenu. */
  elevation?: 'level1' | 'level2';
};

/**
 * Surface unique pour toute l'app — carte blanche à bordure fine + ombre
 * discrète, comme les cartes du dashboard web (`bg-white border shadow-sm`),
 * plutôt qu'une élévation seule façon Material 3.
 */
export function Card({ style, elevation = 'level1', ...otherProps }: CardProps) {
  return (
    <ThemedView
      type="backgroundElement"
      bordered
      style={[styles.base, Elevation[elevation], style]}
      {...otherProps}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
});
