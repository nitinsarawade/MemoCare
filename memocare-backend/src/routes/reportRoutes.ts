import { Router } from 'express';
import * as reportController from '../controllers/reportController';
import { authenticate } from '../middleware/auth';
import { requirePatientAccess, requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createNoteSchema } from '../validators/reportValidators';

// Mounted at /api/v1/patients/:patientId/report(s)
export const reportRouter = Router({ mergeParams: true });
reportRouter.use(authenticate, requirePatientAccess());

/**
 * @openapi
 * /patients/{patientId}/report:
 *   get:
 *     tags: [Reports]
 *     summary: Get the patient's report (full clinical view for staff, simplified for family/caretaker)
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: Report, differentiated by requester's role }
 */
// Role-aware: staff get the full clinical report, family/caretaker get
// the simplified version — same endpoint, differentiated in the service.
reportRouter.get('/', reportController.getReport);

/**
 * @openapi
 * /patients/{patientId}/report/export:
 *   get:
 *     tags: [Reports]
 *     summary: Export the full clinical report (hospital staff/admin only)
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: A downloadable PDF file of the full clinical report
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 *       '403': { description: Family/caretaker cannot export }
 */
// Export is explicitly staff-only per the spec ("hospital staff can
// view/export reports for all patients under their care").
reportRouter.get('/export', requireRole('ADMIN', 'HOSPITAL_STAFF'), reportController.exportReport);

/**
 * @openapi
 * /patients/{patientId}/report/notes:
 *   get:
 *     tags: [Reports]
 *     summary: List clinical notes for a patient (family only sees notes marked visibleToFamily)
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: List of notes }
 *   post:
 *     tags: [Reports]
 *     summary: Add a clinical note to a patient (hospital staff/admin only)
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
 *             required: [body]
 *             properties:
 *               body: { type: string, example: Patient showed mild word-finding difficulty during today's visit. }
 *               visibleToFamily: { type: boolean, default: false, example: false }
 *     responses:
 *       '201': { description: Note created }
 */
reportRouter.get('/notes', reportController.listNotes);
reportRouter.post('/notes', requireRole('ADMIN', 'HOSPITAL_STAFF'), validate(createNoteSchema), reportController.createNote);
