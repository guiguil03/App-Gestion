import { BadRequestException, Controller, Get, Param, Redirect } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { S3StorageService } from '@/common/storage/s3-storage.service';

const ALLOWED_NAMESPACES = new Set(['student-photos', 'school-logos']);
// UUID + extension image, généré côté serveur (randomUUID) — jamais fourni
// tel quel par un client, mais on valide quand même la forme avant de
// construire une clé S3 pour exclure toute tentative de path traversal.
const FILENAME_PATTERN = /^[a-f0-9-]+\.(jpg|png)$/i;

// Les buckets Railway sont privés (contrairement au bucket public Supabase
// Storage utilisé avant la migration) — cette route sert de point d'entrée
// stable et public : elle redirige vers une URL présignée fraîche à chaque
// appel plutôt que de exposer un lien S3 permanent. Pas d'authentification
// ici, volontairement : mêmes garanties qu'avant (nom de fichier UUID non
// devinable), voir StudentPhotoStorageService/SchoolLogoStorageService.
@SkipThrottle()
@Controller('media')
export class MediaController {
  constructor(private readonly storage: S3StorageService) {}

  @Get(':namespace/:filename')
  @Redirect()
  async serve(@Param('namespace') namespace: string, @Param('filename') filename: string) {
    if (!ALLOWED_NAMESPACES.has(namespace) || !FILENAME_PATTERN.test(filename)) {
      throw new BadRequestException('Média introuvable');
    }

    const url = await this.storage.presignedGetUrl(`${namespace}/${filename}`);
    return { url, statusCode: 302 };
  }
}
