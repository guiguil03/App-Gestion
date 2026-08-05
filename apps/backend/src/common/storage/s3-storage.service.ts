import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

const PRESIGNED_URL_TTL_SECONDS = 3600;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new InternalServerErrorException(`Stockage non configuré (${name} manquant)`);
  }
  return value;
}

// Bucket Railway (S3-compatible) partagé par tous les modules qui stockent
// des fichiers (photos élèves, logos écoles). Les buckets Railway sont
// privés par construction (pas d'équivalent au bucket public de Supabase
// Storage utilisé avant) — la lecture passe donc par une URL présignée
// générée à la demande (voir MediaController) plutôt qu'une URL publique
// stable stockée en base.
@Injectable()
export class S3StorageService {
  private client(): S3Client {
    return new S3Client({
      region: process.env.S3_REGION ?? 'auto',
      endpoint: requiredEnv('S3_ENDPOINT'),
      credentials: {
        accessKeyId: requiredEnv('S3_ACCESS_KEY_ID'),
        secretAccessKey: requiredEnv('S3_SECRET_ACCESS_KEY'),
      },
    });
  }

  private bucket(): string {
    return requiredEnv('S3_BUCKET');
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client().send(
      new PutObjectCommand({ Bucket: this.bucket(), Key: key, Body: body, ContentType: contentType }),
    );
  }

  async presignedGetUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket(), Key: key });
    return getSignedUrl(this.client(), command, { expiresIn: PRESIGNED_URL_TTL_SECONDS });
  }
}
