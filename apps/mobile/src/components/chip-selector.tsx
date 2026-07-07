import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export type ChipSelectorItem = { id: string; label: string };

/**
 * Sélecteur en puces défilables horizontalement — contrairement à un
 * segmented control en `flex: 1`, il ne rétrécit jamais les libellés quand
 * il y a beaucoup d'options (plusieurs classes assignées, plusieurs enfants).
 */
export function ChipSelector({
  items,
  selectedId,
  onSelect,
}: {
  items: ChipSelectorItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const theme = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {items.map((item) => {
        const isSelected = item.id === selectedId;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? theme.primary : theme.backgroundElement,
                borderColor: isSelected ? theme.primary : theme.border,
              },
            ]}
          >
            <ThemedText type="smallBold" style={isSelected ? styles.labelActive : undefined}>
              {item.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  labelActive: {
    color: '#ffffff',
  },
});
