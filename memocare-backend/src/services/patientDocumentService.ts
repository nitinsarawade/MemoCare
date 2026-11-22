import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { storageService } from './storageService';
import { recordAuditLog } from './auditService';

export async function uploadDocument(input: {
  patientId: string;
  uploadedById: string;
  title: string;
  file: Express.Multer.File;
}) {
  const ref = await storageService.putObject(input.file.buffer, input.file.originalname, 'documents');

  const doc = await prisma.patientDocument.create({
    data: {
      patientId: input.patientId,
      uploadedById: input.uploadedById,
      title: input.title || input.file.originalname,
      storageKey: ref.key,
      storageProvider: ref.provider,
      mimeType: input.file.mimetype,
      fileSizeBytes: input.file.size,
    },
  });

  await recordAuditLog({
    actorId: input.uploadedById,
    action: 'UPLOAD_DOCUMENT',
    patientId: input.patientId,
    metadata: { documentId: doc.id, title: doc.title },
  });

  return doc;
}

export async function listDocuments(patientId: string) {
  const docs = await prisma.patientDocument.findMany({
    where: { patientId },
    include: { uploadedBy: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return Promise.all(
    docs.map(async (d) => ({
      id: d.id,
      title: d.title,
      mimeType: d.mimeType,
      fileSizeBytes: d.fileSizeBytes,
      createdAt: d.createdAt,
      uploadedBy: d.uploadedBy,
      url: await storageService.getSignedUrl({ key: d.storageKey, provider: d.storageProvider as 'local' | 's3' }),
    }))
  );
}

export async function deleteDocument(documentId: string, actorId: string) {
  const doc = await prisma.patientDocument.findUnique({ where: { id: documentId } });
  if (!doc) throw AppError.notFound('Document not found');

  await storageService.deleteObject({ key: doc.storageKey, provider: doc.storageProvider as 'local' | 's3' });
  await prisma.patientDocument.delete({ where: { id: documentId } });

  await recordAuditLog({
    actorId,
    action: 'DELETE_DOCUMENT',
    patientId: doc.patientId,
    metadata: { documentId, title: doc.title },
  });
}
