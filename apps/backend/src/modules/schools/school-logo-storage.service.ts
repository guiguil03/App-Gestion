import { Injectable, InternalServerErrorException } from '@nestjs/common';

const BUCKET = 'school-logos';
const CONTENT_TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.png': 'image/png' };

// Même approche que StudentPhotoStorageService (voir son commentaire) : le
// disque d'un service Railway est éphémère, le logo doit survivre aux
// redéploiements.
@Injectable()
export class SchoolLogoStorageService {
  async upload(buffer: Buffer, filename: string, extension: string): Promise<string> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      throw new InternalServerErrorException('Stockage des logos non configuré (SUPABASE_URL manquant)');
    }

    const contentType = CONTENT_TYPES[extension];
    const response = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${filename}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: new Uint8Array(buffer),
    });

    if (!response.ok) {
      throw new InternalServerErrorException(`Échec de l'upload du logo (${response.status})`);
    }

    return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filename}`;
  }
}
