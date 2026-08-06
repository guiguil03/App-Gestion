export type EmailSendResult = {
  status: string;
};

// Classe abstraite plutôt qu'interface : même raison que SmsProvider/PushProvider
// — sert de jeton d'injection Nest (`{ provide: EmailProvider, useClass: ... }`)
// pour brancher un vrai service d'envoi sans toucher aux appelants.
export abstract class EmailProvider {
  abstract send(to: string, subject: string, html: string): Promise<EmailSendResult>;
}
