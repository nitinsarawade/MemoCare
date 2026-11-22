import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';

export interface CreateAppointmentInput {
  patientId: string;
  title: string;
  notes?: string;
  scheduledFor: string; // ISO date-time
  createdById: string;
}

export async function createAppointment(input: CreateAppointmentInput) {
  return prisma.appointment.create({
    data: {
      patientId: input.patientId,
      title: input.title,
      notes: input.notes,
      scheduledFor: new Date(input.scheduledFor),
      createdById: input.createdById,
    },
  });
}

export async function listAppointmentsForPatient(patientId: string) {
  return prisma.appointment.findMany({ where: { patientId }, orderBy: { scheduledFor: 'asc' } });
}

export async function updateAppointment(
  appointmentId: string,
  input: Partial<{ title: string; notes: string; scheduledFor: string; status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'MISSED' }>
) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) throw AppError.notFound('Appointment not found');
  const data: Record<string, unknown> = { ...input };
  if (input.scheduledFor) data.scheduledFor = new Date(input.scheduledFor);
  return prisma.appointment.update({ where: { id: appointmentId }, data });
}

export async function deleteAppointment(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) throw AppError.notFound('Appointment not found');
  await prisma.appointment.delete({ where: { id: appointmentId } });
}

/**
 * Finds appointments in the next `windowHours` that haven't had a
 * reminder sent yet. Intended to be called from a scheduled cron/job
 * (see README for wiring a periodic BullMQ repeatable job).
 */
export async function findUpcomingAppointmentsNeedingReminder(windowHours = 24) {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowHours * 3600 * 1000);
  return prisma.appointment.findMany({
    where: {
      status: 'SCHEDULED',
      reminderSent: false,
      scheduledFor: { gte: now, lte: windowEnd },
    },
    include: { patient: { include: { links: true } } },
  });
}

export async function markReminderSent(appointmentId: string) {
  await prisma.appointment.update({ where: { id: appointmentId }, data: { reminderSent: true } });
}
