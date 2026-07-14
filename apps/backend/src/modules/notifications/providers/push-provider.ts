export type PushSendResult = {
  status: string;
};

// Classe abstraite plutôt qu'interface : même raison que SmsProvider — sert
// de jeton d'injection Nest (`{ provide: PushProvider, useClass: ... }`).
export abstract class PushProvider {
  abstract send(expoPushToken: string, title: string, body: string): Promise<PushSendResult>;
}
