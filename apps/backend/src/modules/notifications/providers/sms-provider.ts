export type SmsSendResult = {
  status: string;
  providerId?: string;
};

// Classe abstraite plutôt qu'interface : sert de jeton d'injection Nest
// (`{ provide: SmsProvider, useClass: ... }`) pour brancher une vraie
// passerelle SMS (opérateur local Congo, Twilio, Vonage...) sans toucher à
// NotificationsService.
export abstract class SmsProvider {
  abstract send(to: string, message: string): Promise<SmsSendResult>;
}
