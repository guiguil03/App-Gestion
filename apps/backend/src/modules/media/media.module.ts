import { Module } from '@nestjs/common';

import { MediaController } from '@/modules/media/media.controller';

@Module({
  controllers: [MediaController],
})
export class MediaModule {}
