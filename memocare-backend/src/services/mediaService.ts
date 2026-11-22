import { MediaType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { storageService } from './storageService';
import { enqueueSpeechAnalysis } from '../jobs/queues';
import { trackEvent } from './analyticsService';

export interface UploadMediaInput {
  patientId: string;
  mediaType: MediaType;
  file: Express.Multer.File;
  assessmentTag?: string;
  durationSeconds?: number;
  uploadedById: string;
  /** Whether this session should feed the same speech-analysis pipeline (default true for AUDIO, opt-in for VIDEO). */
  runAnalysis?: boolean;
}

export async function uploadMedia(input: UploadMediaInput) {
  const ref = await storageService.putObject(
    input.file.buffer,
    input.file.originalname,
    input.mediaType === 'AUDIO' ? 'audio' : 'video'
  );

  const session = await prisma.mediaSession.create({
    data: {
      patientId: input.patientId,
      mediaType: input.mediaType,
      storageKey: ref.key,
      storageProvider: ref.provider,
      mimeType: input.file.mimetype,
      durationSeconds: input.durationSeconds,
      assessmentTag: input.assessmentTag,
      uploadedById: input.uploadedById,
      status: 'UPLOADED',
    },
  });

  const shouldAnalyze = input.runAnalysis ?? input.mediaType === 'AUDIO';
  if (shouldAnalyze) {
    await prisma.mediaSession.update({ where: { id: session.id }, data: { status: 'QUEUED' } });
    await enqueueSpeechAnalysis({ mediaSessionId: session.id, patientId: input.patientId });
  }

  await trackEvent(input.mediaType === 'AUDIO' ? 'speech_upload' : 'video_upload', input.uploadedById, {
    patientId: input.patientId,
    mediaSessionId: session.id,
  });

  return session;
}

export async function getMediaSession(mediaSessionId: string) {
  const session = await prisma.mediaSession.findUnique({
    where: { id: mediaSessionId },
    include: { analysisResult: true },
  });
  if (!session) throw AppError.notFound('Media session not found');
  return session;
}

export async function listMediaSessionsForPatient(patientId: string, mediaType?: MediaType) {
  return prisma.mediaSession.findMany({
    where: { patientId, ...(mediaType ? { mediaType } : {}) },
    include: { analysisResult: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getMediaSignedUrl(mediaSessionId: string) {
  const session = await prisma.mediaSession.findUnique({ where: { id: mediaSessionId } });
  if (!session) throw AppError.notFound('Media session not found');
  return storageService.getSignedUrl({ key: session.storageKey, provider: session.storageProvider as 'local' | 's3' });
}
