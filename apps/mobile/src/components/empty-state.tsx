import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme/theme';

export type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  action?: ReactNode;
};

/**
 * État vide standard (icône + titre + description) — remplace les
 * `styles.message`/`styles.emptyList` quasi identiques présents dans
 * presque tous les écrans ("Aucune classe assignée", "Aucun élève"...).
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={theme.textSecondary} />
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      {description && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
          {description}
        </ThemedText>
      )}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
  },
  title: {
    marginTop: Spacing.two,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
  },
  description: {
    textAlign: 'center',
  },
});
