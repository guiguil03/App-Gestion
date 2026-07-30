import { Global, Module } from '@nestjs/common';

import { FieldEncryptionService } from '@/common/crypto/field-encryption';
import { TenantContext } from '@/common/tenant/tenant-context';

@Global()
@Module({
  providers: [TenantContext, FieldEncryptionService],
  exports: [TenantContext, FieldEncryptionService],
})
export class CommonModule {}
