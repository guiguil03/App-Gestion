import { Injectable, Logger } from '@nestjs/common';

import { SmsProvider, type SmsSendResult } from '@/modules/notifications/providers/sms-provider';

// Implémentation de dev/pilote : logue le SMS au lieu de l'envoyer réellement.
// À remplacer par un vrai SmsProvider (opérateur local) une fois un contrat
// choisi — aucun autre fichier n'a besoin de changer pour ça.
@Injectable()
export class MockSmsProvider extends SmsProvider {
  private readonly logger = new Logger(MockSmsProvider.name);

  async send(to: string, message: string): Promise<SmsSendResult> {
    this.logger.log(`[SMS mock] à ${to} : ${message}`);
    return { status: 'sent-mock' };
  }
}
