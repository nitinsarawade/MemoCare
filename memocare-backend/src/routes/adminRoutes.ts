import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createHospitalSchema, approveStaffSchema, listUsersQuerySchema } from '../validators/adminValidators';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

/**
 * @openapi
 * /admin/hospitals:
 *   post:
 *     tags: [Admin]
 *     summary: Create a new hospital (generates an invite code for its staff)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: Riverside Memory Clinic }
 *               address: { type: string, example: 100 Riverside Dr, Springfield }
 *     responses:
 *       '201': { description: Hospital created, includes invite code }
 *   get:
 *     tags: [Admin]
 *     summary: List all hospitals
 *     responses:
 *       '200': { description: List of hospitals }
 */
router.post('/hospitals', validate(createHospitalSchema), adminController.createHospital);
router.get('/hospitals', adminController.listHospitals);

/**
 * @openapi
 * /admin/hospitals/{hospitalId}/rotate-invite-code:
 *   post:
 *     tags: [Admin]
 *     summary: Rotate a hospital's staff invite code (invalidates the old one)
 *     parameters:
 *       - name: hospitalId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: New invite code generated }
 */
router.post('/hospitals/:hospitalId/rotate-invite-code', adminController.rotateInviteCode);

/**
 * @openapi
 * /admin/staff/pending:
 *   get:
 *     tags: [Admin]
 *     summary: List hospital staff accounts awaiting approval
 *     responses:
 *       '200': { description: List of pending staff accounts }
 */
router.get('/staff/pending', adminController.listPendingStaff);

/**
 * @openapi
 * /admin/staff/{userId}/approve:
 *   post:
 *     tags: [Admin]
 *     summary: Approve a pending hospital staff account
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [staffTitle]
 *             properties:
 *               staffTitle: { type: string, enum: [DOCTOR, NURSE, CLINICIAN, ADMIN_STAFF], example: DOCTOR }
 *     responses:
 *       '200': { description: Staff account approved }
 */
router.post('/staff/:userId/approve', validate(approveStaffSchema), adminController.approveStaff);

/**
 * @openapi
 * /admin/staff/{userId}/reject:
 *   post:
 *     tags: [Admin]
 *     summary: Reject a pending hospital staff account
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: Staff account rejected }
 */
router.post('/staff/:userId/reject', adminController.rejectStaff);

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users, optionally filtered by role/status
 *     parameters:
 *       - name: role
 *         in: query
 *         required: false
 *         schema: { type: string, enum: [FAMILY, CARETAKER, HOSPITAL_STAFF, ADMIN] }
 *       - name: status
 *         in: query
 *         required: false
 *         schema: { type: string, enum: [PENDING_VERIFICATION, PENDING_APPROVAL, ACTIVE, SUSPENDED, REJECTED] }
 *     responses:
 *       '200': { description: List of users }
 */
router.get('/users', validate(listUsersQuerySchema, 'query'), adminController.listUsers);

/**
 * @openapi
 * /admin/users/{userId}/suspend:
 *   post:
 *     tags: [Admin]
 *     summary: Suspend a user account
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: User suspended }
 */
router.post('/users/:userId/suspend', adminController.suspendUser);

/**
 * @openapi
 * /admin/users/{userId}/reactivate:
 *   post:
 *     tags: [Admin]
 *     summary: Reactivate a suspended user account
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: User reactivated }
 */
router.post('/users/:userId/reactivate', adminController.reactivateUser);

export default router;
