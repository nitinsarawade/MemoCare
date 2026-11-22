import { Router } from 'express';
import * as appointmentController from '../controllers/appointmentController';
import { authenticate } from '../middleware/auth';
import { requirePatientAccess, requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createAppointmentSchema, updateAppointmentSchema } from '../validators/appointmentValidators';

// Mounted at /api/v1/patients/:patientId/appointments
export const appointmentRouter = Router({ mergeParams: true });
appointmentRouter.use(authenticate, requirePatientAccess());

/**
 * @openapi
 * /patients/{patientId}/appointments:
 *   get:
 *     tags: [Appointments]
 *     summary: List appointments for a patient
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: List of appointments }
 *   post:
 *     tags: [Appointments]
 *     summary: Create an appointment/reminder for a patient (hospital staff, caretaker, or admin)
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
 *             required: [title, scheduledFor]
 *             properties:
 *               title: { type: string, example: Neurology follow-up }
 *               notes: { type: string, example: Bring medication list }
 *               scheduledFor: { type: string, format: date-time, example: 2026-10-01T14:00:00Z }
 *     responses:
 *       '201': { description: Appointment created }
 *       '403': { description: Family members cannot schedule appointments }
 */
appointmentRouter.get('/', appointmentController.listAppointments);
// Per spec: hospital staff or caretakers set reminders (family members
// are excluded from scheduling here, though they can still view).
appointmentRouter.post(
  '/',
  requireRole('ADMIN', 'HOSPITAL_STAFF', 'CARETAKER'),
  validate(createAppointmentSchema),
  appointmentController.createAppointment
);

/**
 * @openapi
 * /patients/{patientId}/appointments/{appointmentId}:
 *   patch:
 *     tags: [Appointments]
 *     summary: Update an appointment
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: appointmentId
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
 *               title: { type: string }
 *               notes: { type: string }
 *               scheduledFor: { type: string, format: date-time }
 *               status: { type: string, enum: [SCHEDULED, COMPLETED, CANCELLED, MISSED] }
 *     responses:
 *       '200': { description: Appointment updated }
 *   delete:
 *     tags: [Appointments]
 *     summary: Delete an appointment
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: appointmentId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '204': { description: Appointment deleted }
 */
appointmentRouter.patch(
  '/:appointmentId',
  requireRole('ADMIN', 'HOSPITAL_STAFF', 'CARETAKER'),
  validate(updateAppointmentSchema),
  appointmentController.updateAppointment
);
appointmentRouter.delete(
  '/:appointmentId',
  requireRole('ADMIN', 'HOSPITAL_STAFF', 'CARETAKER'),
  appointmentController.deleteAppointment
);
