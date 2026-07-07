import { Module } from '@nestjs/common';

import { NotificationsService } from '@/modules/notifications/notifications.service';
import { MockSmsProvider } from '@/modules/notifications/providers/sms-provider.mock';
import { SmsProvider } from '@/modules/notifications/providers/sms-provider';

@Module({
  providers: [NotificationsService, { provide: SmsProvider, useClass: MockSmsProvider }],
})
export class NotificationsModule {}
