import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type AttendanceRecord from '@/db/models/AttendanceRecord';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useSyncStatus } from '@/features/sync/SyncStatusProvider';
import { Elevation, Radius, Spacing } from '@/theme/theme';

/**
 * Indicateur discret : hors ligne, ou nombre de pointages pas encore
 * remontés au backend. `topOffset` : espace supplémentaire au-dessus (ex.
 * le switch checkpoint de l'écran enseignant) — ajouté à l'inset de sécurité
 * de l'appareil plutôt qu'à une position fixe (sinon collision avec
 * l'encoche/Dynamic Island selon l'appareil).
 */
export function SyncStatusBadge({ topOffset = 0 }: { topOffset?: number }) {
  const database = useOptionalDatabase();
  const insets = useSafeAreaInsets();
  const { isOnline } = useSyncStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!database) return;
    const subscription = database
      .get<AttendanceRecord>('attendance_records')
      .query(Q.where('synced_at', null))
      .observeCount()
      .subscribe(setPendingCount);
    return () => subscription.unsubscribe();
  }, [database]);

  const top = insets.top + Spacing.two + topOffset;

  if (!isOnline) {
    return (
      <ThemedView style={[styles.badge, { top }]}>
        <ThemedText type="smallBold">Hors ligne</ThemedText>
      </ThemedView>
    );
  }

  if (pendingCount > 0) {
    return (
      <ThemedView style={[styles.badge, { top }]}>
        <ThemedText type="smallBold">
          {pendingCount} pointage{pendingCount > 1 ? 's' : ''} en attente
        </ThemedText>
      </ThemedView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: Radius.large,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    ...Elevation.level2,
  },
});
