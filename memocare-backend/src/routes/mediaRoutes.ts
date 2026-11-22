import { Router } from 'express';
import * as mediaController from '../controllers/mediaController';
import { authenticate } from '../middleware/auth';
import { requirePatientAccess, requireResourcePatientAccess } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { mediaUpload } from '../middleware/upload';
import { uploadMediaBodySchema, listMediaQuerySchema } from '../validators/mediaValidators';
import { prisma } from '../config/prisma';

// Mounted at /api/v1/patients/:patientId/media
export const patientMediaRouter = Router({ mergeParams: true });
patientMediaRouter.use(authenticate, requirePatientAccess());

/**
 * @openapi
 * /patients/{patientId}/media:
 *   get:
 *     tags: [Media]
 *     summary: List media sessions (recordings) for a patient
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: mediaType
 *         in: query
 *         required: false
 *         schema: { type: string, enum: [AUDIO, VIDEO] }
 *     responses:
 *       '200': { description: List of media sessions }
 */
patientMediaRouter.get('/', validate(listMediaQuerySchema, 'query'), mediaController.listMedia);

/**
 * @openapi
 * /patients/{patientId}/media/audio:
 *   post:
 *     tags: [Media]
 *     summary: Upload an audio recording for speech analysis
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary, description: Audio file (e.g. .wav, .m4a, .mp3) }
 *               assessmentTag: { type: string, example: monthly-checkin }
 *               durationSeconds: { type: integer, example: 45 }
 *               runAnalysis: { type: boolean, example: true, description: Queue background speech-analysis job }
 *     responses:
 *       '201': { description: Upload accepted, returns media session (queues analysis job if runAnalysis) }
 */
patientMediaRouter.post(
  '/audio',
  mediaUpload.single('file'),
  validate(uploadMediaBodySchema),
  mediaController.uploadAudio
);

/**
 * @openapi
 * /patients/{patientId}/media/video:
 *   post:
 *     tags: [Media]
 *     summary: Upload a video recording
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary, description: Video file (e.g. .mp4, .mov) }
 *               assessmentTag: { type: string }
 *               durationSeconds: { type: integer }
 *               runAnalysis: { type: boolean }
 *     responses:
 *       '201': { description: Upload accepted, returns media session }
 */
patientMediaRouter.post(
  '/video',
  mediaUpload.single('file'),
  validate(uploadMediaBodySchema),
  mediaController.uploadVideo
);

// Mounted at /api/v1/media/:mediaSessionId — for direct access by id
// once the client already knows the session (e.g. from a list call).
export const mediaByIdRouter = Router();
mediaByIdRouter.use(authenticate);

const resolveMediaSessionPatientId = async (req: any) => {
  const session = await prisma.mediaSession.findUnique({ where: { id: req.params.mediaSessionId } });
  return session?.patientId ?? null;
};

/**
 * @openapi
 * /media/{mediaSessionId}:
 *   get:
 *     tags: [Media]
 *     summary: Get a media session by id
 *     parameters:
 *       - name: mediaSessionId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: Media session details, including analysis result if available }
 */
mediaByIdRouter.get('/:mediaSessionId', requireResourcePatientAccess(resolveMediaSessionPatientId), mediaController.getMedia);

/**
 * @openapi
 * /media/{mediaSessionId}/url:
 *   get:
 *     tags: [Media]
 *     summary: Get a playable/download URL for a media session's file
 *     parameters:
 *       - name: mediaSessionId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: Signed or local URL to the file }
 */
mediaByIdRouter.get(
  '/:mediaSessionId/url',
  requireResourcePatientAccess(resolveMediaSessionPatientId),
  mediaController.getMediaUrl
);
