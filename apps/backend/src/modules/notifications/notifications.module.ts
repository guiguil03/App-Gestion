import { Module } from '@nestjs/common';

import { NotificationsService } from '@/modules/notifications/notifications.service';
import { ExpoPushProvider } from '@/modules/notifications/providers/push-provider.expo';
import { PushProvider } from '@/modules/notifications/providers/push-provider';
import { MockSmsProvider } from '@/modules/notifications/providers/sms-provider.mock';
import { SmsProvider } from '@/modules/notifications/providers/sms-provider';

@Module({
  providers: [
    NotificationsService,
    { provide: SmsProvider, useClass: MockSmsProvider },
    { provide: PushProvider, useClass: ExpoPushProvider },
  ],
})
export class NotificationsModule {}
