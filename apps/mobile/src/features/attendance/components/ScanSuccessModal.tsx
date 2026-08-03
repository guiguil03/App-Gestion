import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Elevation, Radius, Spacing } from '@/theme/theme';

// Assez long pour qu'un élève ait le temps de lire et de rendre l'appareil
// au suivant, assez court pour ne pas bloquer la classe qui scanne en file.
const AUTO_DISMISS_MS = 2500;

export type ScanSuccessInfo = { isLate: boolean };

/**
 * Confirmation plein écran après le scan du QR de session par un élève —
 * remplace la simple bannière (peu visible pour un enfant) pour ce cas
 * précis. Se ferme seule après un délai, ou au premier tap.
 */
export function ScanSuccessModal({ info, onDismiss }: { info: ScanSuccessInfo | null; onDismiss: () => void }) {
  const theme = useTheme();
  const [scale] = useState(() => new Animated.Value(0.85));

  useEffect(() => {
    if (!info) return;

    scale.setValue(0.85);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();

    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [info, onDismiss, scale]);

  if (!info) return null;

  const color = info.isLate ? theme.warning : theme.success;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <ThemedView type="backgroundElement" style={[styles.panel, Elevation.level2]}>
            <ThemedView style={[styles.iconCircle, { backgroundColor: color }]}>
              <Ionicons name={info.isLate ? 'time' : 'checkmark'} size={48} color="#ffffff" />
            </ThemedView>
            <ThemedText type="subtitle" style={styles.title}>
              Présence enregistrée !
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              {info.isLate ? 'Tu es arrivé en retard, mais ta présence est bien prise en compte.' : 'Bonne journée !'}
            </ThemedText>
          </ThemedView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
  },
  panel: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.xlarge,
    maxWidth: 320,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
});
