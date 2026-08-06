import { Injectable, Logger } from '@nestjs/common';

import { EmailProvider, type EmailSendResult } from '@/modules/notifications/providers/email-provider';

const RESEND_API_URL = 'https://api.resend.com/emails';

export type ResendConfig = {
  apiKey: string;
  fromAddress: string;
};

export function resendConfigFromEnv(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromAddress) return null;
  return { apiKey, fromAddress };
}

/**
 * Passerelle email réelle (Resend) — même principe que TwilioSmsProvider :
 * appel HTTP direct (pas de SDK) sélectionné automatiquement par
 * NotificationsModule dès que RESEND_API_KEY/RESEND_FROM_EMAIL sont
 * renseignées ; sinon MockEmailProvider reste utilisé.
 */
@Injectable()
export class ResendEmailProvider extends EmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);

  constructor(private readonly config: ResendConfig) {
    super();
  }

  async send(to: string, subject: string, html: string): Promise<EmailSendResult> {
    try {
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.config.fromAddress, to, subject, html }),
      });

      if (!response.ok) {
        this.logger.warn(`Échec d'envoi email à ${to} (HTTP ${response.status})`);
        return { status: 'failed' };
      }

      return { status: 'sent' };
    } catch (error) {
      this.logger.warn(`Échec d'envoi email à ${to}`, error);
      return { status: 'failed' };
    }
  }
}
