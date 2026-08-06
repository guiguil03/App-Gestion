import { Module } from '@nestjs/common';

import { NotificationsService } from '@/modules/notifications/notifications.service';
import { EmailProvider } from '@/modules/notifications/providers/email-provider';
import { MockEmailProvider } from '@/modules/notifications/providers/email-provider.mock';
import { ResendEmailProvider, resendConfigFromEnv } from '@/modules/notifications/providers/email-provider.resend';
import { ExpoPushProvider } from '@/modules/notifications/providers/push-provider.expo';
import { PushProvider } from '@/modules/notifications/providers/push-provider';
import { MockSmsProvider } from '@/modules/notifications/providers/sms-provider.mock';
import { SmsProvider } from '@/modules/notifications/providers/sms-provider';
import { TwilioSmsProvider, twilioConfigFromEnv } from '@/modules/notifications/providers/sms-provider.twilio';

@Module({
  providers: [
    NotificationsService,
    {
      provide: SmsProvider,
      // Twilio dès que TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER
      // sont renseignées (prod) — MockSmsProvider sinon (dev/pilote sans
      // contrat opérateur), sans qu'aucun autre fichier n'ait à changer.
      useFactory: () => {
        const config = twilioConfigFromEnv();
        return config ? new TwilioSmsProvider(config) : new MockSmsProvider();
      },
    },
    { provide: PushProvider, useClass: ExpoPushProvider },
    {
      provide: EmailProvider,
      // Même principe que SmsProvider : Resend dès que RESEND_API_KEY/
      // RESEND_FROM_EMAIL sont renseignées, MockEmailProvider sinon.
      useFactory: () => {
        const config = resendConfigFromEnv();
        return config ? new ResendEmailProvider(config) : new MockEmailProvider();
      },
    },
  ],
  exports: [EmailProvider],
})
export class NotificationsModule {}
