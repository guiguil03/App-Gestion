import { Module } from '@nestjs/common';

import { SigningKeysController } from '@/modules/signing-keys/signing-keys.controller';
import { SigningKeysService } from '@/modules/signing-keys/signing-keys.service';

@Module({
  controllers: [SigningKeysController],
  providers: [SigningKeysService],
  exports: [SigningKeysService],
})
export class SigningKeysModule {}
