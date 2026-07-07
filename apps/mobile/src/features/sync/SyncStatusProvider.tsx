import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { runSync } from '@/services/sync';

type SyncStatus = {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  /** Déclenche un cycle de sync manuellement (ex. juste après un login). No-op si déjà en cours ou hors ligne. */
  triggerSync: () => void;
};

const SyncStatusContext = createContext<SyncStatus>({
  isOnline: true,
  isSyncing: false,
  lastSyncedAt: null,
  triggerSync: () => {},
});

export function useSyncStatus(): SyncStatus {
  return useContext(SyncStatusContext);
}

/**
 * Déclenche automatiquement un cycle de sync sur reconnexion réseau et sur
 * retour au premier plan de l'app, en plus des déclenchements manuels (ex.
 * après un login). N'a aucun effet en Expo Go (pas de base locale).
 */
export function SyncStatusProvider({ children }: { children: ReactNode }) {
  const database = useOptionalDatabase();
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const wasOffline = useRef(false);
  const syncInFlight = useRef(false);

  const triggerSync = useCallback(() => {
    if (!database || syncInFlight.current) return;
    syncInFlight.current = true;
    setIsSyncing(true);
    runSync(database)
      .then(() => setLastSyncedAt(new Date()))
      .catch((error) => {
        // Échec attendu en usage normal (hors ligne, backend injoignable) :
        // on retentera au prochain déclencheur, pas d'alerte bloquante.
        console.warn('[sync] échec du cycle de synchronisation', error);
      })
      .finally(() => {
        syncInFlight.current = false;
        setIsSyncing(false);
      });
  }, [database]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected);
      setIsOnline(online);
      if (online && wasOffline.current) {
        triggerSync();
      }
      wasOffline.current = !online;
    });
    return unsubscribe;
  }, [triggerSync]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        triggerSync();
      }
    });
    return () => subscription.remove();
  }, [triggerSync]);

  const value = useMemo(
    () => ({ isOnline, isSyncing, lastSyncedAt, triggerSync }),
    [isOnline, isSyncing, lastSyncedAt, triggerSync],
  );

  return <SyncStatusContext.Provider value={value}>{children}</SyncStatusContext.Provider>;
}
