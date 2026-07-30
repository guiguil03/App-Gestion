import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

import { SmsProvider, type SmsSendResult } from '@/modules/notifications/providers/sms-provider';

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

export type TwilioConfig = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
};

export function twilioConfigFromEnv(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !fromNumber) return null;
  return { accountSid, authToken, fromNumber };
}

/**
 * Passerelle SMS réelle (Twilio) — §3.4 du cahier des charges. Sélectionnée
 * automatiquement par NotificationsModule dès que TWILIO_ACCOUNT_SID/
 * TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER sont renseignées ; sinon
 * MockSmsProvider reste utilisé (dev/pilote sans contrat opérateur).
 * Appel HTTP direct (Basic Auth) plutôt que le SDK `twilio` pour éviter une
 * dépendance supplémentaire — l'API REST est stable et suffisante ici.
 */
@Injectable()
export class TwilioSmsProvider extends SmsProvider {
  private readonly logger = new Logger(TwilioSmsProvider.name);

  constructor(private readonly config: TwilioConfig) {
    super();
  }

  async send(to: string, message: string): Promise<SmsSendResult> {
    // Twilio exige le format E.164 (pas d'espaces) — le numéro stocké est
    // validé côté saisie (ParentGuardianDto) mais peut contenir des espaces.
    const normalizedTo = to.replace(/\s+/g, '');

    const body = new URLSearchParams({ To: normalizedTo, From: this.config.fromNumber, Body: message });
    const credentials = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64');

    try {
      const response = await fetch(`${TWILIO_API_BASE}/Accounts/${this.config.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });

      const data = (await response.json().catch(() => null)) as { sid?: string; message?: string } | null;

      if (!response.ok) {
        this.logger.warn(`Échec d'envoi SMS à ${normalizedTo} (HTTP ${response.status}) : ${data?.message ?? 'erreur inconnue'}`);
        Sentry.metrics.count('sms.delivery', 1, { attributes: { status: 'failed' } });
        return { status: 'failed' };
      }

      Sentry.metrics.count('sms.delivery', 1, { attributes: { status: 'sent' } });
      return { status: 'sent', providerId: data?.sid };
    } catch (error) {
      this.logger.warn(`Échec d'envoi SMS à ${normalizedTo}`, error);
      Sentry.metrics.count('sms.delivery', 1, { attributes: { status: 'failed' } });
      return { status: 'failed' };
    }
  }
}
