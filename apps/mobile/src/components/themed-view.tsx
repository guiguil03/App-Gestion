import { View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/theme/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
  /** Ajoute une bordure fine (`theme.border`) — définit visuellement les cartes/surfaces. */
  bordered?: boolean;
};

export function ThemedView({ style, lightColor, darkColor, type, bordered, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        { backgroundColor: theme[type ?? 'background'] },
        bordered && { borderWidth: 1, borderColor: theme.border },
        style,
      ]}
      {...otherProps}
    />
  );
}
