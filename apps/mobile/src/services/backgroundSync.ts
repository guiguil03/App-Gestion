import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { database } from '@/db/database';
import { runSync } from '@/services/sync';

export const BACKGROUND_SYNC_TASK = 'presence-scolaire-background-sync';

// Défini en portée globale (hors composant React) — condition imposée par
// expo-task-manager pour que la tâche reste appelable même app fermée/tuée.
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  if (!database) return BackgroundTask.BackgroundTaskResult.Failed; // Expo Go : base locale indisponible
  try {
    await runSync(database);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Idempotent — à appeler une fois au démarrage de l'app (voir app/_layout.tsx).
 * Best-effort au-delà de ça : l'OS impose son propre intervalle réel et ne
 * garantit pas l'exécution (économie de batterie, app jamais relancée...) —
 * ceci complète le retry en foreground de SyncStatusProvider, ça ne le remplace pas.
 */
export async function registerBackgroundSync(): Promise<void> {
  if (!database) return;
  const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  if (alreadyRegistered) return;
  // minimumInterval en minutes (cf. doc expo-background-task) : 15 est le
  // plancher pratique sur iOS/Android, pas une garantie de fréquence réelle.
  await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, { minimumInterval: 15 });
}
