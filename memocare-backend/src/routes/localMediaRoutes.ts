import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';
import { authenticate } from '../middleware/auth';
import { requireResourcePatientAccess } from '../middleware/rbac';
import { prisma } from '../config/prisma';

const router = Router();

/**
 * Serves files written by the local storage driver. In production
 * (STORAGE_DRIVER=s3) this route is unused — clients fetch the
 * presigned URL returned by GET /media/:mediaSessionId/url directly
 * from the bucket instead.
 *
 * Access control: the caller must be authenticated AND allowed to access
 * the patient that owns the file (same rules as every other patient route).
 * A key that doesn't belong to any patient record is not served at all.
 * This is still not a substitute for real signed URLs (expiry) in production.
 */
/**
 * @openapi
 * /media/local/{key}:
 *   get:
 *     tags: [Media]
 *     summary: Serve a locally-stored media file (dev only; production uses signed S3 URLs)
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '200': { description: File contents }
 *       '404': { description: File not found }
 */
async function resolveOwningPatientId(key: string): Promise<string | null> {
  const [member, doc, media] = await Promise.all([
    prisma.patientFamilyMember.findFirst({ where: { storageKey: key }, select: { patientId: true } }),
    prisma.patientDocument.findFirst({ where: { storageKey: key }, select: { patientId: true } }),
    prisma.mediaSession.findFirst({ where: { storageKey: key }, select: { patientId: true } }),
  ]);
  return member?.patientId ?? doc?.patientId ?? media?.patientId ?? null;
}

router.get('/local/:key(*)', authenticate, requireResourcePatientAccess((req) => resolveOwningPatientId(req.params.key)), (req, res) => {
  const key = req.params.key;
  const resolvedRoot = path.resolve(env.storage.localPath);
  const resolvedPath = path.resolve(resolvedRoot, key);
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(resolvedRoot + path.sep)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid path' } });
  }
  if (!fs.existsSync(resolvedPath)) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'File not found' } });
  }
  return res.sendFile(resolvedPath);
});

export default router;
