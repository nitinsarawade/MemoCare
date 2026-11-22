import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as mediaService from '../services/mediaService';
import { AppError } from '../utils/errors';
import { recordAuditLog } from '../services/auditService';

export const uploadAudio = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw AppError.badRequest('An audio file is required (multipart field "file")');
  const session = await mediaService.uploadMedia({
    patientId: req.params.patientId,
    mediaType: req.file.mimetype.startsWith('video/') ? 'VIDEO' : 'AUDIO',
    file: req.file,
    assessmentTag: req.body.assessmentTag,
    durationSeconds: req.body.durationSeconds,
    uploadedById: req.auth!.userId,
    runAnalysis: req.body.runAnalysis,
  });
  res.status(201).json({ data: session });
});

export const uploadVideo = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw AppError.badRequest('A video file is required (multipart field "file")');
  const session = await mediaService.uploadMedia({
    patientId: req.params.patientId,
    mediaType: 'VIDEO',
    file: req.file,
    assessmentTag: req.body.assessmentTag,
    durationSeconds: req.body.durationSeconds,
    uploadedById: req.auth!.userId,
    runAnalysis: req.body.runAnalysis ?? false,
  });
  res.status(201).json({ data: session });
});

export const listMedia = asyncHandler(async (req: Request, res: Response) => {
  const sessions = await mediaService.listMediaSessionsForPatient(req.params.patientId, req.query.mediaType as any);
  res.status(200).json({ data: sessions });
});

export const getMedia = asyncHandler(async (req: Request, res: Response) => {
  const session = await mediaService.getMediaSession(req.params.mediaSessionId);
  await recordAuditLog({
    actorId: req.auth!.userId,
    patientId: session.patientId,
    action: session.mediaType === 'AUDIO' ? 'VIEW_SPEECH_RESULT' : 'VIEW_VIDEO_SESSION',
    resourceType: 'MediaSession',
    resourceId: session.id,
  });
  res.status(200).json({ data: session });
});

export const getMediaUrl = asyncHandler(async (req: Request, res: Response) => {
  const url = await mediaService.getMediaSignedUrl(req.params.mediaSessionId);
  res.status(200).json({ data: { url } });
});
