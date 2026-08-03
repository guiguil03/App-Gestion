import { Image, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

export type AvatarProps = {
  /** Nom utilisé pour dériver l'initiale affichée si `photoUrl` est absente. */
  name: string;
  photoUrl?: string | null;
  /** Couleur de fond de la pastille d'initiale — défaut `theme.primary`. */
  color?: string;
  size?: number;
};

/**
 * Avatar circulaire (photo ou initiale) — remplace le pattern recopié dans
 * dashboard/eleves/classe/children (chacun avec sa propre paire de styles
 * avatar+avatarImage/avatarLabel).
 */
export function Avatar({ name, photoUrl, color, size = 36 }: AvatarProps) {
  const theme = useTheme();
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={dimension} />;
  }

  return (
    <ThemedView style={[styles.initial, dimension, { backgroundColor: color ?? theme.primary }]}>
      <ThemedText style={[styles.label, { fontSize: size * 0.42 }]}>{name.charAt(0).toUpperCase()}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  initial: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
