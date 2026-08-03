import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

const FRAME_SIZE = 260;
const CORNER_SIZE = 32;
const CORNER_THICKNESS = 4;
const DIM_COLOR = 'rgba(0, 0, 0, 0.45)';

/**
 * Cadre de visée superposé au flux caméra : sans lui, l'écran de scan n'est
 * qu'un rectangle plein écran sans repère visuel. Assombrit tout ce qui est
 * hors du carré central et ajoute des coins accentués façon viseur QR, avec
 * une instruction sous le cadre.
 */
export function ScanFrameOverlay({ instruction }: { instruction: string }) {
  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.dimRow} />
      <View style={styles.middleRow}>
        <View style={styles.dimSide} />
        <View style={styles.frame}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
        </View>
        <View style={styles.dimSide} />
      </View>
      <View style={[styles.dimRow, styles.bottomRow]}>
        <ThemedText type="smallBold" style={styles.instruction}>
          {instruction}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dimRow: {
    flex: 1,
    width: '100%',
    backgroundColor: DIM_COLOR,
  },
  bottomRow: {
    alignItems: 'center',
    paddingTop: 28,
    paddingHorizontal: 32,
  },
  middleRow: {
    height: FRAME_SIZE,
    flexDirection: 'row',
  },
  dimSide: {
    flex: 1,
    backgroundColor: DIM_COLOR,
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#FFFFFF',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 12,
  },
  instruction: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
