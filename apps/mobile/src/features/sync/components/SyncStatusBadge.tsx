import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Q } from '@nozbe/watermelondb';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type AttendanceRecord from '@/db/models/AttendanceRecord';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useSyncStatus } from '@/features/sync/SyncStatusProvider';

/** Indicateur discret : hors ligne, ou nombre de pointages pas encore remontés au backend. */
export function SyncStatusBadge() {
  const database = useOptionalDatabase();
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

  if (!isOnline) {
    return (
      <ThemedView type="backgroundElement" style={styles.badge}>
        <ThemedText type="smallBold">Hors ligne</ThemedText>
      </ThemedView>
    );
  }

  if (pendingCount > 0) {
    return (
      <ThemedView type="backgroundElement" style={styles.badge}>
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
    top: 100,
    left: 24,
    right: 24,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
});
