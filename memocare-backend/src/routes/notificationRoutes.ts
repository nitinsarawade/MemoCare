import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { setPreferenceSchema } from '../validators/notificationValidators';

const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List notifications for the current user
 *     responses:
 *       '200': { description: List of notifications }
 */
router.get('/', notificationController.listMyNotifications);

/**
 * @openapi
 * /notifications/{notificationId}/read:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 *     parameters:
 *       - name: notificationId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: Notification marked read }
 */
router.post('/:notificationId/read', notificationController.markRead);

/**
 * @openapi
 * /notifications/preferences:
 *   get:
 *     tags: [Notifications]
 *     summary: List the current user's notification preferences
 *     responses:
 *       '200': { description: List of preferences }
 *   put:
 *     tags: [Notifications]
 *     summary: Set a notification preference (in-app/email) for a notification type
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, inAppEnabled, emailEnabled]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [TEST_REMINDER, RISK_ALERT, LINK_INVITE, APPOINTMENT_REMINDER, SYSTEM]
 *                 example: APPOINTMENT_REMINDER
 *               inAppEnabled: { type: boolean, example: true }
 *               emailEnabled: { type: boolean, example: false }
 *     responses:
 *       '200': { description: Preference saved }
 */
router.get('/preferences', notificationController.listPreferences);
router.put('/preferences', validate(setPreferenceSchema), notificationController.setPreference);

export default router;
