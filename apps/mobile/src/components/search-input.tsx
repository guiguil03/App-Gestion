import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme/theme';

export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Rechercher…',
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Ionicons name="search" size={16} color={theme.textSecondary} />
      <TextInput
        style={[styles.input, { color: theme.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Ionicons
          name="close-circle"
          size={16}
          color={theme.textSecondary}
          onPress={() => onChangeText('')}
          suppressHighlighting
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
});
