import { Router } from 'express';
import * as patientController from '../controllers/patientController';
import { authenticate } from '../middleware/auth';
import { requirePatientAccess, requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  createPatientSchema,
  updatePatientSchema,
  inviteLinkSchema,
  acceptInviteSchema,
  dismissPatientSchema,
} from '../validators/patientValidators';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /patients:
 *   get:
 *     tags: [Patients]
 *     summary: List patients visible to the current user (scoped by role)
 *     responses:
 *       '200': { description: List of patients }
 *   post:
 *     tags: [Patients]
 *     summary: Register a new patient
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, dateOfBirth]
 *             properties:
 *               firstName: { type: string, example: Eleanor }
 *               lastName: { type: string, example: Whitfield }
 *               dateOfBirth: { type: string, format: date, example: 1948-04-12 }
 *               sex: { type: string, example: female }
 *               emergencyContactName: { type: string, example: Sam Chen }
 *               emergencyContactPhone: { type: string, example: 555-0100 }
 *               medicalHistoryNotes: { type: string, description: Encrypted at rest }
 *               diagnosisStatus: { type: string, example: undiagnosed }
 *               assignedDoctorId:
 *                 type: string
 *                 format: uuid
 *                 description: Hospital-staff only - assign to a specific doctor at the same hospital
 *     responses:
 *       '201': { description: Patient created }
 */
router.get('/', patientController.listPatients);
router.post('/', validate(createPatientSchema), patientController.createPatient);
router.get('/staff-options', patientController.listStaffOptions);
router.get('/dismissed', requireRole('HOSPITAL_STAFF', 'ADMIN'), patientController.listDismissed);
router.post('/:patientId/dismiss', requireRole('HOSPITAL_STAFF', 'ADMIN'), requirePatientAccess(), validate(dismissPatientSchema), patientController.dismissPatient);
router.post('/:patientId/readmit', requireRole('HOSPITAL_STAFF', 'ADMIN'), requirePatientAccess(), patientController.readmitPatient);

/**
 * @openapi
 * /patients/accept-invite:
 *   post:
 *     tags: [Patients]
 *     summary: Accept a patient-link invite by token (from the invite email)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       '200': { description: Link accepted }
 */
router.post('/accept-invite', validate(acceptInviteSchema), patientController.acceptInvite);

/**
 * @openapi
 * /patients/{patientId}:
 *   get:
 *     tags: [Patients]
 *     summary: Get a patient by id (RBAC enforced)
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: Patient record }
 *       '403': { description: Forbidden - not linked/assigned to this patient }
 *       '404': { description: Patient not found }
 *   patch:
 *     tags: [Patients]
 *     summary: Update a patient (RBAC enforced)
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
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               dateOfBirth: { type: string, format: date }
 *               sex: { type: string }
 *               emergencyContactName: { type: string }
 *               emergencyContactPhone: { type: string }
 *               medicalHistoryNotes: { type: string }
 *               diagnosisStatus: { type: string }
 *     responses:
 *       '200': { description: Updated patient }
 */
router.get('/:patientId', requirePatientAccess(), patientController.getPatient);
router.patch('/:patientId', requirePatientAccess(), validate(updatePatientSchema), patientController.updatePatient);
router.patch('/:patientId/assignment', requireRole('ADMIN'), requirePatientAccess(), patientController.assignDoctor);
router.patch('/:patientId/assignment', requireRole('ADMIN'), requirePatientAccess(), patientController.assignDoctor);

/**
 * @openapi
 * /patients/{patientId}/links:
 *   get:
 *     tags: [Patients]
 *     summary: List users linked to a patient
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: List of links }
 */
router.get('/:patientId/links', requirePatientAccess(), patientController.listLinks);

/**
 * @openapi
 * /patients/{patientId}/links/invite:
 *   post:
 *     tags: [Patients]
 *     summary: Invite a family member or caretaker to a patient by email
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
 *             required: [email, linkRole]
 *             properties:
 *               email: { type: string, format: email }
 *               linkRole: { type: string, enum: [FAMILY_MEMBER, CARETAKER, ATTENDING_STAFF] }
 *     responses:
 *       '201': { description: User linked directly, or invited by email if no account exists yet }
 */
router.post(
  '/:patientId/links/invite',
  requirePatientAccess(),
  validate(inviteLinkSchema),
  patientController.inviteLink
);

/**
 * @openapi
 * /patients/{patientId}/links/{userId}:
 *   delete:
 *     tags: [Patients]
 *     summary: Unlink a user from a patient
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '204': { description: Unlinked }
 */
router.delete('/:patientId/links/:userId', requirePatientAccess(), patientController.unlinkUser);

export default router;
