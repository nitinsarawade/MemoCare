import { Router } from 'express';
import * as locationController from '../controllers/locationController';
import { authenticate } from '../middleware/auth';
import { requirePatientAccess, requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  createSafeZoneSchema,
  updateSafeZoneSchema,
  authenticatedLocationPingSchema,
  publicLocationPingSchema,
} from '../validators/locationValidators';

// Mounted at /api/v1/patients/:patientId/location
export const patientLocationRouter = Router({ mergeParams: true });
patientLocationRouter.use(authenticate, requirePatientAccess());

/**
 * @openapi
 * /patients/{patientId}/location/latest:
 *   get:
 *     tags: [Location]
 *     summary: Get the patient's most recent real GPS location
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: Latest location check-in, or null if none yet }
 */
patientLocationRouter.get('/latest', locationController.getLatestLocation);

/**
 * @openapi
 * /patients/{patientId}/location/history:
 *   get:
 *     tags: [Location]
 *     summary: Get the patient's location check-in history (for a map trail)
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: List of past check-ins, most recent first }
 */
patientLocationRouter.get('/history', locationController.getLocationHistory);

/**
 * @openapi
 * /patients/{patientId}/location/check-in:
 *   post:
 *     tags: [Location]
 *     summary: Submit a real GPS check-in from an authenticated caretaker/staff app
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [latitude, longitude]
 *             properties:
 *               latitude: { type: number, example: 40.7128 }
 *               longitude: { type: number, example: -74.0060 }
 *               accuracyMeters: { type: number, example: 12 }
 *     responses:
 *       '201': { description: Check-in recorded (triggers a safe-zone alert if outside all active zones) }
 */
patientLocationRouter.post(
  '/check-in',
  validate(authenticatedLocationPingSchema),
  locationController.recordAuthenticatedCheckIn
);

/**
 * @openapi
 * /patients/{patientId}/location/share-links:
 *   get:
 *     tags: [Location]
 *     summary: List location-share links created for this patient
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: List of share tokens }
 *   post:
 *     tags: [Location]
 *     summary: Generate a new no-login location-sharing link for the patient's own device (revokes any previous active link)
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '201':
 *         description: New share link created — open shareUrl on the patient's phone browser to start real GPS sharing
 */
patientLocationRouter.get('/share-links', requireRole('ADMIN', 'HOSPITAL_STAFF', 'CARETAKER'), locationController.listShareTokens);
patientLocationRouter.post(
  '/share-links',
  requireRole('ADMIN', 'HOSPITAL_STAFF', 'CARETAKER'),
  locationController.createShareToken
);

/**
 * @openapi
 * /patients/{patientId}/location/share-links/{tokenId}:
 *   delete:
 *     tags: [Location]
 *     summary: Revoke a location-share link
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: tokenId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '204': { description: Link revoked }
 */
patientLocationRouter.delete(
  '/share-links/:tokenId',
  requireRole('ADMIN', 'HOSPITAL_STAFF', 'CARETAKER'),
  locationController.revokeShareToken
);

// Mounted at /api/v1/patients/:patientId/safe-zones
export const safeZoneRouter = Router({ mergeParams: true });
safeZoneRouter.use(authenticate, requirePatientAccess());

/**
 * @openapi
 * /patients/{patientId}/safe-zones:
 *   get:
 *     tags: [Location]
 *     summary: List safe zones (geofences) configured for a patient
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: List of safe zones }
 *   post:
 *     tags: [Location]
 *     summary: Create a safe zone — leaving every active zone triggers a real alert
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, centerLat, centerLng, radiusMeters]
 *             properties:
 *               name: { type: string, example: Home }
 *               centerLat: { type: number, example: 40.7128 }
 *               centerLng: { type: number, example: -74.0060 }
 *               radiusMeters: { type: number, example: 300 }
 *     responses:
 *       '201': { description: Safe zone created }
 */
safeZoneRouter.get('/', locationController.listSafeZones);
safeZoneRouter.post(
  '/',
  requireRole('ADMIN', 'HOSPITAL_STAFF', 'CARETAKER'),
  validate(createSafeZoneSchema),
  locationController.createSafeZone
);

/**
 * @openapi
 * /patients/{patientId}/safe-zones/{safeZoneId}:
 *   patch:
 *     tags: [Location]
 *     summary: Update a safe zone
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: safeZoneId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               centerLat: { type: number }
 *               centerLng: { type: number }
 *               radiusMeters: { type: number }
 *               isActive: { type: boolean }
 *     responses:
 *       '200': { description: Safe zone updated }
 *   delete:
 *     tags: [Location]
 *     summary: Delete a safe zone
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: safeZoneId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '204': { description: Safe zone deleted }
 */
safeZoneRouter.patch(
  '/:safeZoneId',
  requireRole('ADMIN', 'HOSPITAL_STAFF', 'CARETAKER'),
  validate(updateSafeZoneSchema),
  locationController.updateSafeZone
);
safeZoneRouter.delete(
  '/:safeZoneId',
  requireRole('ADMIN', 'HOSPITAL_STAFF', 'CARETAKER'),
  locationController.deleteSafeZone
);

// Mounted at /api/v1/location — PUBLIC, no auth. Guarded instead by the
// unguessable share token itself (see locationService.resolvePatientIdFromShareToken).
export const publicLocationRouter = Router();

/**
 * @openapi
 * /location/ping:
 *   post:
 *     tags: [Location]
 *     summary: Submit a real GPS location using a no-login share link token (called by the standalone browser page)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, latitude, longitude]
 *             properties:
 *               token: { type: string, description: The token from a share link's URL }
 *               latitude: { type: number, example: 40.7128 }
 *               longitude: { type: number, example: -74.0060 }
 *               accuracyMeters: { type: number, example: 15 }
 *     responses:
 *       '201': { description: Location recorded }
 *       '401': { description: Invalid or revoked share link }
 */
publicLocationRouter.post('/ping', validate(publicLocationPingSchema), locationController.publicPing);
