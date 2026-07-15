import { Injectable, InternalServerErrorException } from '@nestjs/common';

const BUCKET = 'student-photos';
const CONTENT_TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.png': 'image/png' };

// Le disque d'un service Railway est éphémère (perdu à chaque redéploiement)
// — les photos élève doivent survivre aux redéploiements, d'où Supabase
// Storage plutôt que le système de fichiers local. Le bucket est public
// (mêmes garanties d'accès qu'avant : noms de fichiers aléatoires non
// devinables, cf. randomUUID côté contrôleur) mais l'upload lui-même passe
// par la clé service_role, jamais exposée au client.
@Injectable()
export class StudentPhotoStorageService {
  async upload(buffer: Buffer, filename: string, extension: string): Promise<string> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      throw new InternalServerErrorException('Stockage des photos non configuré (SUPABASE_URL manquant)');
    }

    const contentType = CONTENT_TYPES[extension];
    const response = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${filename}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': contentType,
        'x-upsert': 'false',
      },
      body: new Uint8Array(buffer),
    });

    if (!response.ok) {
      throw new InternalServerErrorException(`Échec de l'upload de la photo (${response.status})`);
    }

    return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filename}`;
  }
}
