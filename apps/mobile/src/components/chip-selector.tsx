import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme/theme';

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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      {items.map((item) => {
        const isSelected = item.id === selectedId;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? theme.active : theme.backgroundElement,
                borderColor: isSelected ? theme.active : theme.border,
              },
            ]}
          >
            <ThemedText type="smallBold" style={isSelected ? { color: theme.activeText } : undefined}>
              {item.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // `flexGrow`/`flexShrink: 0` + hauteur explicite : sans ça, ce ScrollView
  // horizontal peut se voir attribuer tout l'espace vertical restant de la
  // colonne parente selon les écrans (observé en prod : les puces s'étirent
  // en immenses pavés verticaux sur certains écrans mais pas d'autres, pour
  // un layout parent par ailleurs identique). On fige la hauteur pour rendre
  // le composant immunisé à ce comportement, quelle que soit la disposition
  // parente.
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: 44,
  },
  container: {
    gap: Spacing.two,
    paddingRight: Spacing.two,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1,
    justifyContent: 'center',
  },
});
