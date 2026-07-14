import { Injectable, Logger } from '@nestjs/common';

import { PushProvider, type PushSendResult } from '@/modules/notifications/providers/push-provider';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Contrairement au SMS (pas de contrat opérateur choisi), l'API push d'Expo
// ne nécessite aucune inscription préalable pour envoyer à un token de
// device — utilisable directement en production.
@Injectable()
export class ExpoPushProvider extends PushProvider {
  private readonly logger = new Logger(ExpoPushProvider.name);

  async send(expoPushToken: string, title: string, body: string): Promise<PushSendResult> {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: expoPushToken, title, body }),
    });
    if (!response.ok) {
      this.logger.warn(`Échec envoi push (HTTP ${response.status})`);
      return { status: 'failed' };
    }
    return { status: 'sent' };
  }
}
