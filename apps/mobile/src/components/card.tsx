import { StyleSheet, type ViewProps } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Elevation, Radius, Spacing } from '@/theme/theme';

export type CardProps = ViewProps & {
  /** `level1` = carte au repos (défaut) ; `level2` = élément flottant au-dessus du contenu. */
  elevation?: 'level1' | 'level2';
};

/**
 * Surface élevée unique pour toute l'app — remplace les usages ad hoc de
 * `ThemedView bordered` (bordure fine) recopiés dans dashboard/eleves/
 * profil/carte avec des rayons différents à chaque fois. Ombre douce plutôt
 * que bordure, cohérent avec l'inspiration Material 3.
 */
export function Card({ style, elevation = 'level1', ...otherProps }: CardProps) {
  return <ThemedView type="backgroundElement" style={[styles.base, Elevation[elevation], style]} {...otherProps} />;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.large,
    padding: Spacing.three,
  },
});
