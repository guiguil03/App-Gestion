import { StyleSheet, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/theme/theme';

/**
 * Conteneur racine standard pour les écrans d'onglets (`headerShown: false`).
 * Remplace le `paddingTop` fixe recopié dans chaque écran — sans lui, le
 * contenu passe sous l'encoche/Dynamic Island selon l'appareil (observé :
 * le titre de page chevauchait l'horloge de la status bar). Ne pas utiliser
 * pour les écrans plein cadre (scan caméra) qui gèrent leur propre overlay.
 */
export function Screen({ style, ...otherProps }: ViewProps) {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView
      style={[styles.base, { paddingTop: insets.top + Spacing.two }, style]}
      {...otherProps}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
});
