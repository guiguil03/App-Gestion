// apps/mobile/src/services/offlineCache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'offline-cache.';

/** Sauvegarde silencieuse — un échec d'écriture cache ne doit jamais faire planter le flux appelant. */
export async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // best-effort
  }
}

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
