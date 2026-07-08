import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';

/** Bouton retour pour les écrans poussés sans header (`headerShown: false`) hors des onglets. */
export function BackButton() {
  const theme = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={() => router.back()}
      hitSlop={8}
    >
      <Ionicons name="chevron-back" size={22} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    padding: 4,
    marginLeft: 20,
    marginBottom: 4,
  },
  pressed: {
    opacity: 0.6,
  },
});
