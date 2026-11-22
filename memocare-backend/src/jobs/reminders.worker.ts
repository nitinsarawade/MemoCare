import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { logger } from '../config/logger';
import { REMINDERS_QUEUE, scheduleReminderChecks } from './queues';
import * as appointmentService from '../services/appointmentService';
import * as medicationService from '../services/medicationService';
import { notifyAppointmentReminder, notifyMedicationReminder } from '../services/notificationService';

/**
 * Runs on every tick (every 5 minutes, see queues.ts):
 *   1. Finds appointments in the next 24h that haven't had a reminder
 *      sent yet, notifies every linked user, and marks them sent.
 *   2. Finds medication doses due right now (within a grace window)
 *      that haven't had a reminder sent yet, notifies every linked
 *      user, and marks them sent.
 *
 * This is the piece that was previously documented but never wired up
 * — appointment reminders existed as a function nobody called. Both
 * reminder types are now genuinely triggered by the server itself,
 * with no client polling required.
 */
async function checkDueReminders() {
  const appointments = await appointmentService.findUpcomingAppointmentsNeedingReminder(24);
  for (const appt of appointments) {
    const recipientUserIds = new Set(appt.patient.links.map((l) => l.userId));
    for (const userId of recipientUserIds) {
      await notifyAppointmentReminder(userId, appt.title, appt.scheduledFor);
    }
    await appointmentService.markReminderSent(appt.id);
  }
  if (appointments.length > 0) {
    logger.info(`Sent ${appointments.length} appointment reminder(s)`);
  }

  const dueDoses = await medicationService.findDueDosesNeedingReminder();
  for (const dose of dueDoses) {
    await notifyMedicationReminder(dose.patientId, dose.medicationName, dose.scheduledFor);
    await medicationService.markReminderSent(dose.logId);
  }
  if (dueDoses.length > 0) {
    logger.info(`Sent ${dueDoses.length} medication reminder(s)`);
  }
}

new Worker(
  REMINDERS_QUEUE,
  async () => {
    await checkDueReminders();
  },
  { connection: redisConnection }
);

// Register the repeatable schedule when the worker process starts.
scheduleReminderChecks().catch((err) => logger.error({ err }, 'Failed to schedule reminder checks'));
