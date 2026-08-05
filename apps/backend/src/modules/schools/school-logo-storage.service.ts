import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { publicMediaUrl } from '@/common/storage/media-url';
import { S3StorageService } from '@/common/storage/s3-storage.service';

const NAMESPACE = 'school-logos';
const CONTENT_TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.png': 'image/png' };

// Même approche que StudentPhotoStorageService (voir son commentaire) : le
// disque d'un service Railway est éphémère, le logo doit survivre aux
// redéploiements.
@Injectable()
export class SchoolLogoStorageService {
  constructor(private readonly storage: S3StorageService) {}

  async upload(buffer: Buffer, filename: string, extension: string): Promise<string> {
    const contentType = CONTENT_TYPES[extension];
    if (!contentType) {
      throw new InternalServerErrorException(`Extension de logo non supportée (${extension})`);
    }

    await this.storage.put(`${NAMESPACE}/${filename}`, buffer, contentType);

    return publicMediaUrl(NAMESPACE, filename);
  }
}
