// apps/mobile/src/services/pushNotifications.ts
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { apiClient } from '@/api/client';

/**
 * Demande la permission de notification et récupère le jeton Expo Push de
 * l'appareil, puis l'enregistre côté backend (POST /auth/push-token) —
 * c'est ce jeton que NotificationsService utilise pour prévenir un parent
 * quand son enfant est pointé présent (déjà géré côté backend, cf.
 * modules/notifications). Ne fait rien sur simulateur/émulateur (les push
 * notifications n'y fonctionnent pas) ni si la permission est refusée —
 * échoue silencieusement dans ces cas, ce n'est pas un flux bloquant.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) return;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    await apiClient.post('/auth/push-token', { expoPushToken });
  } catch {
    // Best-effort : un échec ici (permission système capricieuse, jeton
    // indisponible temporairement...) ne doit jamais bloquer l'utilisateur.
  }
}
