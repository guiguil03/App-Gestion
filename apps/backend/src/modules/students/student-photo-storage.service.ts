import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { publicMediaUrl } from '@/common/storage/media-url';
import { S3StorageService } from '@/common/storage/s3-storage.service';

const NAMESPACE = 'student-photos';
const CONTENT_TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.png': 'image/png' };

// Le disque d'un service Railway est éphémère (perdu à chaque redéploiement)
// — les photos élève doivent survivre aux redéploiements, d'où le bucket
// Railway plutôt que le système de fichiers local. Les noms de fichiers
// restent des UUID aléatoires non devinables (cf. randomUUID côté
// contrôleur) : même garantie d'accès qu'avec l'ancien bucket public
// Supabase, servie ici via une redirection vers une URL présignée
// (voir MediaController) puisque les buckets Railway sont privés.
@Injectable()
export class StudentPhotoStorageService {
  constructor(private readonly storage: S3StorageService) {}

  async upload(buffer: Buffer, filename: string, extension: string): Promise<string> {
    const contentType = CONTENT_TYPES[extension];
    if (!contentType) {
      throw new InternalServerErrorException(`Extension de photo non supportée (${extension})`);
    }

    await this.storage.put(`${NAMESPACE}/${filename}`, buffer, contentType);

    return publicMediaUrl(NAMESPACE, filename);
  }
}
