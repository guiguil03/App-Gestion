import { Injectable, Logger } from '@nestjs/common';

import { PushProvider, type PushSendResult } from '@/modules/notifications/providers/push-provider';

@Injectable()
export class MockPushProvider extends PushProvider {
  private readonly logger = new Logger(MockPushProvider.name);

  async send(expoPushToken: string, title: string, body: string): Promise<PushSendResult> {
    this.logger.log(`[Push mock] à ${expoPushToken} : ${title} — ${body}`);
    return { status: 'sent-mock' };
  }
}
