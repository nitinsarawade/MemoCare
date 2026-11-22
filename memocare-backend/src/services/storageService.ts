import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as getS3PresignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';

/**
 * StorageService is the single abstraction the rest of the app talks to
 * for binary media (audio/video/images). Set STORAGE_DRIVER=s3 in .env
 * (plus S3_* credentials/bucket) to use real cloud storage instead of
 * the local disk driver — same contract either way (key in, key out,
 * signed URL out), no calling code changes needed.
 */
export interface StoredObjectRef {
  key: string;
  provider: 'local' | 's3';
}

let s3Client: S3Client | null = null;
function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.storage.s3Region,
      endpoint: env.storage.s3Endpoint || undefined,
      forcePathStyle: !!env.storage.s3Endpoint, // needed for S3-compatible services (e.g. MinIO, R2, DigitalOcean Spaces)
      credentials:
        env.storage.s3AccessKeyId && env.storage.s3SecretAccessKey
          ? { accessKeyId: env.storage.s3AccessKeyId, secretAccessKey: env.storage.s3SecretAccessKey }
          : undefined, // falls back to the environment's default AWS credential chain
    });
  }
  return s3Client;
}

class StorageService {
  async putObject(buffer: Buffer, originalName: string, prefix: string): Promise<StoredObjectRef> {
    const ext = path.extname(originalName) || '';
    const key = `${prefix}/${randomUUID()}${ext}`;

    if (env.storage.driver === 'local') {
      const fullPath = path.join(env.storage.localPath, key);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, buffer);
      return { key, provider: 'local' };
    }

    await getS3Client().send(
      new PutObjectCommand({ Bucket: env.storage.s3Bucket, Key: key, Body: buffer })
    );
    return { key, provider: 's3' };
  }

  /**
   * Returns a URL the client can use to fetch the object. Local storage
   * uses an internal route on this API; S3 returns a real time-limited
   * presigned GET URL straight to the bucket.
   */
  async getSignedUrl(ref: StoredObjectRef, expiresInSeconds = 900): Promise<string> {
    if (ref.provider === 'local') {
      return `${env.appUrl}/api/v1/media/local/${encodeURIComponent(ref.key)}?exp=${expiresInSeconds}`;
    }

    const command = new GetObjectCommand({ Bucket: env.storage.s3Bucket, Key: ref.key });
    return getS3PresignedUrl(getS3Client(), command, { expiresIn: expiresInSeconds });
  }

  async deleteObject(ref: StoredObjectRef): Promise<void> {
    if (ref.provider === 'local') {
      const fullPath = path.join(env.storage.localPath, ref.key);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      return;
    }

    await getS3Client().send(new DeleteObjectCommand({ Bucket: env.storage.s3Bucket, Key: ref.key }));
  }
}

export const storageService = new StorageService();
