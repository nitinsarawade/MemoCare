import { NotificationType, NotificationChannel } from '@prisma/client';
import { prisma } from '../config/prisma';
import { sendEmail, emailTemplates } from './emailService';

const RISK_ALERT_THRESHOLD = 66; // matches HIGH risk level cutoff in mlRiskService

async function getRecipientsForPatient(patientId: string): Promise<string[]> {
  const links = await prisma.patientLink.findMany({ where: { patientId }, select: { userId: true } });
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { hospitalId: true } });
  const staffIds = patient?.hospitalId
    ? (
        await prisma.user.findMany({
          where: { hospitalId: patient.hospitalId, role: 'HOSPITAL_STAFF', status: 'ACTIVE' },
          select: { id: true },
        })
      ).map((u) => u.id)
    : [];
  return Array.from(new Set([...links.map((l) => l.userId), ...staffIds]));
}

async function dispatchNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  metadata?: Record<string, unknown>
) {
  const prefs = await prisma.notificationPreference.findUnique({ where: { userId_type: { userId, type } } });
  const inAppEnabled = prefs?.inAppEnabled ?? true;
  const emailEnabled = prefs?.emailEnabled ?? true;

  if (inAppEnabled) {
    await prisma.notification.create({
      data: { userId, type, channel: 'IN_APP' as NotificationChannel, title, body, metadata: metadata as any, sentAt: new Date() },
    });
  }
  if (emailEnabled) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await sendEmail({ to: user.email, subject: title, html: `<p>${body}</p>` });
      await prisma.notification.create({
        data: { userId, type, channel: 'EMAIL' as NotificationChannel, title, body, metadata: metadata as any, sentAt: new Date() },
      });
    }
  }
}

export async function notifyRiskAlertIfNeeded(patientId: string, riskLevel: string, riskScore: number) {
  if (riskLevel !== 'HIGH' && riskScore < RISK_ALERT_THRESHOLD) return;
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return;
  const recipients = await getRecipientsForPatient(patientId);
  const tmpl = emailTemplates.riskAlert(`${patient.firstName} ${patient.lastName}`, riskLevel);
  for (const userId of recipients) {
    await dispatchNotification(userId, 'RISK_ALERT', tmpl.subject, tmpl.html, { patientId, riskLevel, riskScore });
  }
}

export async function notifyTestReminder(patientId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return;
  const recipients = await getRecipientsForPatient(patientId);
  const tmpl = emailTemplates.testReminder(`${patient.firstName} ${patient.lastName}`);
  for (const userId of recipients) {
    await dispatchNotification(userId, 'TEST_REMINDER', tmpl.subject, tmpl.html, { patientId });
  }
}

export async function notifyAppointmentReminder(userId: string, title: string, when: Date) {
  await dispatchNotification(
    userId,
    'APPOINTMENT_REMINDER',
    'Upcoming appointment reminder',
    `Reminder: "${title}" is scheduled for ${when.toISOString()}.`
  );
}

export async function notifyMedicationReminder(patientId: string, medicationName: string, scheduledFor: Date) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return;
  const recipients = await getRecipientsForPatient(patientId);
  const title = 'Medication reminder';
  const body = `It's time for ${patient.firstName} ${patient.lastName} to take ${medicationName} (scheduled ${scheduledFor.toLocaleTimeString()}).`;
  for (const userId of recipients) {
    await dispatchNotification(userId, 'MEDICATION_REMINDER', title, body, {
      patientId,
      medicationName,
      scheduledFor,
    });
  }
}

export async function dispatchLocationAlert(
  patientId: string,
  patientName: string,
  location: { latitude: number; longitude: number }
) {
  const recipients = await getRecipientsForPatient(patientId);
  const title = 'Location alert';
  const body = `${patientName} has moved outside their configured safe zone (last seen ${location.latitude.toFixed(
    5
  )}, ${location.longitude.toFixed(5)}).`;
  for (const userId of recipients) {
    await dispatchNotification(userId, 'LOCATION_ALERT', title, body, { patientId, ...location });
  }
}

export async function listNotificationsForUser(userId: string, unreadOnly = false) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { readAt: new Date() } });
}

export async function setNotificationPreference(
  userId: string,
  type: NotificationType,
  inAppEnabled: boolean,
  emailEnabled: boolean
) {
  return prisma.notificationPreference.upsert({
    where: { userId_type: { userId, type } },
    update: { inAppEnabled, emailEnabled },
    create: { userId, type, inAppEnabled, emailEnabled },
  });
}

export async function listNotificationPreferences(userId: string) {
  return prisma.notificationPreference.findMany({ where: { userId } });
}
