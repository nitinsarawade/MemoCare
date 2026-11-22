import { Router } from 'express';
import * as progressController from '../controllers/progressController';
import { authenticate } from '../middleware/auth';
import { requirePatientAccess } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { progressQuerySchema } from '../validators/progressValidators';

// Mounted at /api/v1/patients/:patientId/progress
export const progressRouter = Router({ mergeParams: true });
progressRouter.use(authenticate, requirePatientAccess());

/**
 * @openapi
 * /patients/{patientId}/progress/timeline:
 *   get:
 *     tags: [Progress]
 *     summary: Get the patient's cognitive-progress timeline (screening + speech-analysis history)
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: from
 *         in: query
 *         required: false
 *         schema: { type: string, format: date }
 *       - name: to
 *         in: query
 *         required: false
 *         schema: { type: string, format: date }
 *     responses:
 *       '200': { description: Timeline data points }
 */
progressRouter.get('/timeline', validate(progressQuerySchema, 'query'), progressController.getTimeline);

/**
 * @openapi
 * /patients/{patientId}/progress/summary:
 *   get:
 *     tags: [Progress]
 *     summary: Get a summarized trend (improving/stable/declining) for a patient
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: from
 *         in: query
 *         required: false
 *         schema: { type: string, format: date }
 *       - name: to
 *         in: query
 *         required: false
 *         schema: { type: string, format: date }
 *     responses:
 *       '200': { description: Progress summary and trend }
 */
progressRouter.get('/summary', validate(progressQuerySchema, 'query'), progressController.getSummary);
