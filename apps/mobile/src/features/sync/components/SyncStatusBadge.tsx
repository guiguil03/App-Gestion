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
  const [rejectedCount, setRejectedCount] = useState(0);

  useEffect(() => {
    if (!database) return;
    const records = database.get<AttendanceRecord>('attendance_records');
    // Un pointage rejeté par le serveur ne sera jamais réessayé
    // automatiquement (voir services/sync.ts) : compté à part de "en
    // attente" pour ne pas laisser croire qu'il finira par se synchroniser
    // tout seul — sans ça, seul Sentry voyait ce rejet, jamais l'utilisateur.
    const pendingSubscription = records
      .query(Q.where('synced_at', null), Q.where('rejection_reason', null))
      .observeCount()
      .subscribe(setPendingCount);
    const rejectedSubscription = records
      .query(Q.where('rejection_reason', Q.notEq(null)))
      .observeCount()
      .subscribe(setRejectedCount);
    return () => {
      pendingSubscription.unsubscribe();
      rejectedSubscription.unsubscribe();
    };
  }, [database]);

  const top = insets.top + Spacing.two + topOffset;

  if (!isOnline && rejectedCount === 0) {
    return (
      <ThemedView style={[styles.badge, { top }]}>
        <ThemedText type="smallBold">Hors ligne</ThemedText>
      </ThemedView>
    );
  }

  if (rejectedCount === 0 && pendingCount === 0) {
    return null;
  }

  return (
    <ThemedView style={[styles.badge, { top }]}>
      {!isOnline && <ThemedText type="smallBold">Hors ligne</ThemedText>}
      {pendingCount > 0 && (
        <ThemedText type="smallBold">
          {pendingCount} pointage{pendingCount > 1 ? 's' : ''} en attente
        </ThemedText>
      )}
      {rejectedCount > 0 && (
        <ThemedText type="smallBold" themeColor="danger">
          {rejectedCount} pointage{rejectedCount > 1 ? 's' : ''} rejeté{rejectedCount > 1 ? 's' : ''} — à corriger manuellement
        </ThemedText>
      )}
    </ThemedView>
  );
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
