import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { registerBackgroundSync } from '@/services/backgroundSync';
import { runSync } from '@/services/sync';

// Sur un réseau "connecté" mais en réalité cassé (portail captif, Wi-Fi sans
// sortie internet...), ni la reconnexion NetInfo ni le retour au premier plan
// ne se déclenchent : un enseignant qui reste sur l'écran de scan verrait ses
// pointages rester en attente indéfiniment sans ce filet.
const FOREGROUND_SYNC_RETRY_INTERVAL_MS = 5 * 60 * 1000;

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

  useEffect(() => {
    const interval = setInterval(triggerSync, FOREGROUND_SYNC_RETRY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [triggerSync]);

  useEffect(() => {
    registerBackgroundSync().catch((error) => {
      console.warn("[sync] échec de l'enregistrement de la tâche de fond", error);
    });
  }, []);

  const value = useMemo(
    () => ({ isOnline, isSyncing, lastSyncedAt, triggerSync }),
    [isOnline, isSyncing, lastSyncedAt, triggerSync],
  );

  return <SyncStatusContext.Provider value={value}>{children}</SyncStatusContext.Provider>;
}
