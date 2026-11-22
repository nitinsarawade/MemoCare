import { Router } from 'express';
import * as medicationController from '../controllers/medicationController';
import { authenticate } from '../middleware/auth';
import { requirePatientAccess, requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createMedicationSchema, updateMedicationSchema, logDoseSchema } from '../validators/medicationValidators';

// Mounted at /api/v1/patients/:patientId/medications
export const medicationRouter = Router({ mergeParams: true });
medicationRouter.use(authenticate, requirePatientAccess());

/**
 * @openapi
 * /patients/{patientId}/medications:
 *   get:
 *     tags: [Medications]
 *     summary: List a patient's medications
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: activeOnly
 *         in: query
 *         required: false
 *         schema: { type: boolean }
 *     responses:
 *       '200': { description: List of medications }
 *   post:
 *     tags: [Medications]
 *     summary: Add a medication and its reminder schedule for a patient (staff/caretaker/admin)
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
 *             oneOf:
 *               - type: object
 *                 required: [name, startDate, scheduleType, timesOfDay]
 *                 properties:
 *                   name: { type: string, example: Donepezil }
 *                   dosage: { type: string, example: 5mg tablet }
 *                   instructions: { type: string, example: Take in the evening with food }
 *                   startDate: { type: string, format: date, example: 2026-09-17 }
 *                   endDate: { type: string, format: date }
 *                   scheduleType: { type: string, enum: [RECURRING_DAILY], example: RECURRING_DAILY }
 *                   timesOfDay:
 *                     type: array
 *                     items: { type: string, example: "20:00" }
 *                     description: 24-hour "HH:mm" times, one per daily dose
 *               - type: object
 *                 required: [name, startDate, scheduleType, specificDateTimes]
 *                 properties:
 *                   name: { type: string, example: Flu vaccine booster }
 *                   dosage: { type: string }
 *                   instructions: { type: string }
 *                   startDate: { type: string, format: date, example: 2026-09-17 }
 *                   endDate: { type: string, format: date }
 *                   scheduleType: { type: string, enum: [SPECIFIC_DATES], example: SPECIFIC_DATES }
 *                   specificDateTimes:
 *                     type: array
 *                     items: { type: string, format: date-time, example: "2026-09-25T09:00:00Z" }
 *                     description: Exact date/month/year date-times (up to 50) for one-off or non-daily alarms
 *     responses:
 *       '201': { description: Medication created }
 *       '400': { description: Validation error, or the patient already has 10 active medications }
 */
medicationRouter.get('/', medicationController.listMedications);
medicationRouter.post(
  '/',
  requireRole('ADMIN', 'HOSPITAL_STAFF', 'CARETAKER'),
  validate(createMedicationSchema),
  medicationController.createMedication
);

/**
 * @openapi
 * /patients/{patientId}/medications/today:
 *   get:
 *     tags: [Medications]
 *     summary: Get today's dose schedule with live status (upcoming/due/missed/taken/skipped)
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: Today's schedule }
 */
medicationRouter.get('/today', medicationController.getTodaysSchedule);

/**
 * @openapi
 * /patients/{patientId}/medications/history:
 *   get:
 *     tags: [Medications]
 *     summary: List past dose log history for a patient
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: Dose history }
 */
medicationRouter.get('/history', medicationController.listDoseHistory);

/**
 * @openapi
 * /patients/{patientId}/medications/{medicationId}:
 *   patch:
 *     tags: [Medications]
 *     summary: Update a medication or its schedule
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: medicationId
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
 *               dosage: { type: string }
 *               instructions: { type: string }
 *               scheduleType: { type: string, enum: [RECURRING_DAILY, SPECIFIC_DATES] }
 *               timesOfDay: { type: array, items: { type: string } }
 *               specificDateTimes: { type: array, items: { type: string, format: date-time } }
 *               startDate: { type: string, format: date }
 *               endDate: { type: string, format: date }
 *               isActive: { type: boolean }
 *     responses:
 *       '200': { description: Medication updated }
 *   delete:
 *     tags: [Medications]
 *     summary: Delete a medication
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: medicationId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '204': { description: Medication deleted }
 */
medicationRouter.patch(
  '/:medicationId',
  requireRole('ADMIN', 'HOSPITAL_STAFF', 'CARETAKER'),
  validate(updateMedicationSchema),
  medicationController.updateMedication
);
medicationRouter.delete(
  '/:medicationId',
  requireRole('ADMIN', 'HOSPITAL_STAFF', 'CARETAKER'),
  medicationController.deleteMedication
);

/**
 * @openapi
 * /patients/{patientId}/medications/{medicationId}/log:
 *   post:
 *     tags: [Medications]
 *     summary: Record whether a scheduled dose was taken, missed, or skipped
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: medicationId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scheduledFor, status]
 *             properties:
 *               scheduledFor:
 *                 type: string
 *                 format: date-time
 *                 description: The exact scheduled dose time this log is for (from the /today response)
 *               status: { type: string, enum: [TAKEN, MISSED, SKIPPED], example: TAKEN }
 *               takenAt: { type: string, format: date-time, description: Defaults to now if status is TAKEN }
 *     responses:
 *       '200': { description: Dose logged }
 */
medicationRouter.post('/:medicationId/log', validate(logDoseSchema), medicationController.logDose);
