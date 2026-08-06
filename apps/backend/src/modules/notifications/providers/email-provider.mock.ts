import { Injectable, Logger } from '@nestjs/common';

import { EmailProvider, type EmailSendResult } from '@/modules/notifications/providers/email-provider';

// Implémentation de dev/pilote : logue l'email au lieu de l'envoyer
// réellement. À remplacer par un vrai EmailProvider (Resend...) une fois les
// identifiants disponibles — aucun autre fichier n'a besoin de changer pour ça.
@Injectable()
export class MockEmailProvider extends EmailProvider {
  private readonly logger = new Logger(MockEmailProvider.name);

  async send(to: string, subject: string): Promise<EmailSendResult> {
    this.logger.log(`[Email mock] à ${to} : ${subject}`);
    return { status: 'sent-mock' };
  }
}
