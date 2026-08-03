import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme/theme';

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'danger';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
};

/**
 * Bouton unique pour toute l'app — remplace les `Pressable` + styles ad hoc
 * recopiés dans login/scan/session/profil (variantes fond plein, fond
 * tonal, contour, danger). Le spinner de chargement est géré ici plutôt que
 * dupliqué à chaque écran qui a un état "en cours".
 */
export function Button({ label, variant = 'filled', icon, loading, disabled, ...pressableProps }: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const variantStyle = {
    filled: { backgroundColor: theme.primary },
    tonal: { backgroundColor: theme.backgroundElement },
    outlined: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.border },
    danger: { backgroundColor: theme.danger },
  }[variant];

  const labelColor = variant === 'tonal' || variant === 'outlined' ? theme.primary : theme.primaryText;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
      disabled={isDisabled}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={labelColor} />}
          <ThemedText type="smallBold" style={{ color: labelColor }}>
            {label}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.medium,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
});
