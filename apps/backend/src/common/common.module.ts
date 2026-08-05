import { Global, Module } from '@nestjs/common';

import { FieldEncryptionService } from '@/common/crypto/field-encryption';
import { S3StorageService } from '@/common/storage/s3-storage.service';
import { TenantContext } from '@/common/tenant/tenant-context';

@Global()
@Module({
  providers: [TenantContext, FieldEncryptionService, S3StorageService],
  exports: [TenantContext, FieldEncryptionService, S3StorageService],
})
export class CommonModule {}
