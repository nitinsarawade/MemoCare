import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';

// A real, enforced cap — the 11th active medication for a patient is
// rejected with a clear error rather than silently accepted.
export const MAX_ACTIVE_MEDICATIONS_PER_PATIENT = 10;

export interface CreateMedicationInput {
  patientId: string;
  name: string;
  dosage?: string;
  instructions?: string;
  scheduleType?: 'RECURRING_DAILY' | 'SPECIFIC_DATES';
  timesOfDay?: string[]; // required when scheduleType = RECURRING_DAILY
  specificDateTimes?: string[]; // ISO date-times, required when scheduleType = SPECIFIC_DATES
  startDate: string;
  endDate?: string;
  createdById: string;
}

export async function createMedication(input: CreateMedicationInput) {
  const activeCount = await prisma.medication.count({ where: { patientId: input.patientId, isActive: true } });
  if (activeCount >= MAX_ACTIVE_MEDICATIONS_PER_PATIENT) {
    throw AppError.badRequest(
      `This patient already has ${MAX_ACTIVE_MEDICATIONS_PER_PATIENT} active medications, the maximum allowed. Deactivate or delete one before adding another.`
    );
  }

  const scheduleType = input.scheduleType ?? 'RECURRING_DAILY';
  if (scheduleType === 'RECURRING_DAILY' && (!input.timesOfDay || input.timesOfDay.length === 0)) {
    throw AppError.badRequest('timesOfDay is required when scheduleType is RECURRING_DAILY');
  }
  if (scheduleType === 'SPECIFIC_DATES' && (!input.specificDateTimes || input.specificDateTimes.length === 0)) {
    throw AppError.badRequest('specificDateTimes is required when scheduleType is SPECIFIC_DATES');
  }

  return prisma.medication.create({
    data: {
      patientId: input.patientId,
      name: input.name,
      dosage: input.dosage,
      instructions: input.instructions,
      scheduleType,
      timesOfDay: input.timesOfDay ?? [],
      specificDateTimes: (input.specificDateTimes ?? []).map((d) => new Date(d)),
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      createdById: input.createdById,
    },
  });
}

export async function listMedicationsForPatient(patientId: string, activeOnly = false) {
  return prisma.medication.findMany({
    where: { patientId, ...(activeOnly ? { isActive: true } : {}) },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateMedication(
  medicationId: string,
  input: Partial<{
    name: string;
    dosage: string;
    instructions: string;
    scheduleType: 'RECURRING_DAILY' | 'SPECIFIC_DATES';
    timesOfDay: string[];
    specificDateTimes: string[];
    startDate: string;
    endDate: string;
    isActive: boolean;
  }>
) {
  const medication = await prisma.medication.findUnique({ where: { id: medicationId } });
  if (!medication) throw AppError.notFound('Medication not found');

  // Reactivating a previously-deactivated medication still counts
  // against the cap, same as creating a new one.
  if (input.isActive === true && !medication.isActive) {
    const activeCount = await prisma.medication.count({ where: { patientId: medication.patientId, isActive: true } });
    if (activeCount >= MAX_ACTIVE_MEDICATIONS_PER_PATIENT) {
      throw AppError.badRequest(
        `This patient already has ${MAX_ACTIVE_MEDICATIONS_PER_PATIENT} active medications, the maximum allowed.`
      );
    }
  }

  const data: Record<string, unknown> = { ...input };
  if (input.startDate) data.startDate = new Date(input.startDate);
  if (input.endDate) data.endDate = new Date(input.endDate);
  if (input.specificDateTimes) data.specificDateTimes = input.specificDateTimes.map((d) => new Date(d));
  return prisma.medication.update({ where: { id: medicationId }, data });
}

export async function deleteMedication(medicationId: string) {
  const medication = await prisma.medication.findUnique({ where: { id: medicationId } });
  if (!medication) throw AppError.notFound('Medication not found');
  await prisma.medication.delete({ where: { id: medicationId } });
}

/**
 * Combines today's date (server-local) with a medication's "HH:mm"
 * time-of-day strings to get real scheduled Date objects for today.
 * Only used for RECURRING_DAILY medications.
 */
function recurringTimesForDay(timesOfDay: string[], referenceDate: Date): Date[] {
  const startOfDay = new Date(referenceDate);
  startOfDay.setHours(0, 0, 0, 0);
  return timesOfDay.map((t) => {
    const [h, m] = t.split(':').map(Number);
    const d = new Date(startOfDay);
    d.setHours(h, m, 0, 0);
    return d;
  });
}

/**
 * Returns every scheduled dose time this medication produces that
 * falls on the same calendar day as `referenceDate` — for
 * RECURRING_DAILY this is computed from timesOfDay; for
 * SPECIFIC_DATES it's just whichever exact date-times land on that day.
 */
function scheduledTimesForDay(
  med: { scheduleType: string; timesOfDay: string[]; specificDateTimes: Date[] },
  referenceDate: Date
): Date[] {
  if (med.scheduleType === 'SPECIFIC_DATES') {
    const startOfDay = new Date(referenceDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(referenceDate);
    endOfDay.setHours(23, 59, 59, 999);
    return med.specificDateTimes.filter((d) => d >= startOfDay && d <= endOfDay);
  }
  return recurringTimesForDay(med.timesOfDay, referenceDate);
}

export interface TodayDoseEntry {
  medicationId: string;
  medicationName: string;
  dosage: string | null;
  instructions: string | null;
  scheduledFor: Date;
  status: 'PENDING' | 'TAKEN' | 'MISSED' | 'SKIPPED' | 'UPCOMING' | 'DUE';
  logId: string | null;
}

const GRACE_PERIOD_MS = 30 * 60 * 1000; // 30 min after scheduled time before showing as "MISSED"
const DUE_WINDOW_MS = 15 * 60 * 1000; // shows as "DUE" starting 15 min before scheduled time

/**
 * Today's medication schedule for a patient, merging real logged
 * doses with a live-computed status for doses that haven't been
 * logged yet. Works for both recurring daily medications and
 * specific-date alarms that happen to fall today.
 */
export async function getTodaysSchedule(patientId: string): Promise<TodayDoseEntry[]> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const medications = await prisma.medication.findMany({
    where: {
      patientId,
      isActive: true,
      startDate: { lte: endOfDay },
      OR: [{ endDate: null }, { endDate: { gte: startOfDay } }],
    },
  });

  const entries: TodayDoseEntry[] = [];

  for (const med of medications) {
    const scheduledTimes = scheduledTimesForDay(med, now);
    if (scheduledTimes.length === 0) continue;

    const logs = await prisma.medicationLog.findMany({
      where: { medicationId: med.id, scheduledFor: { gte: startOfDay, lte: endOfDay } },
    });
    const logsByTime = new Map(logs.map((l) => [l.scheduledFor.getTime(), l]));

    for (const scheduledFor of scheduledTimes) {
      const existingLog = logsByTime.get(scheduledFor.getTime());
      let status: TodayDoseEntry['status'];
      let logId: string | null = null;

      if (existingLog && existingLog.status !== 'PENDING') {
        status = existingLog.status;
        logId = existingLog.id;
      } else {
        const msSinceScheduled = now.getTime() - scheduledFor.getTime();
        if (msSinceScheduled > GRACE_PERIOD_MS) status = 'MISSED';
        else if (msSinceScheduled > -DUE_WINDOW_MS) status = 'DUE';
        else status = 'UPCOMING';
        logId = existingLog?.id ?? null;
      }

      entries.push({
        medicationId: med.id,
        medicationName: med.name,
        dosage: med.dosage,
        instructions: med.instructions,
        scheduledFor,
        status,
        logId,
      });
    }
  }

  return entries.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
}

export async function logDose(
  patientId: string,
  medicationId: string,
  scheduledForIso: string,
  status: 'TAKEN' | 'MISSED' | 'SKIPPED',
  recordedById: string,
  takenAtIso?: string
) {
  const medication = await prisma.medication.findUnique({ where: { id: medicationId } });
  if (!medication || medication.patientId !== patientId) throw AppError.notFound('Medication not found');

  const scheduledFor = new Date(scheduledForIso);
  return prisma.medicationLog.upsert({
    where: { medicationId_scheduledFor: { medicationId, scheduledFor } },
    update: {
      status,
      recordedById,
      takenAt: status === 'TAKEN' ? new Date(takenAtIso ?? Date.now()) : null,
    },
    create: {
      medicationId,
      patientId,
      scheduledFor,
      status,
      recordedById,
      takenAt: status === 'TAKEN' ? new Date(takenAtIso ?? Date.now()) : null,
    },
  });
}

export async function listDoseHistory(patientId: string, limit = 100) {
  return prisma.medicationLog.findMany({
    where: { patientId },
    include: { medication: { select: { name: true, dosage: true } } },
    orderBy: { scheduledFor: 'desc' },
    take: limit,
  });
}

/**
 * Called by the background reminder job (see jobs/reminders.worker.ts).
 * Finds doses due right now (within the due window) — for recurring
 * medications that means "today's HH:mm slot"; for specific-date
 * medications it checks every stored date-time, not just today's,
 * since a one-off alarm could legitimately be any future date. Any
 * due dose without a log row yet gets a PENDING log created, and is
 * returned so the caller can send a real notification.
 */
export async function findDueDosesNeedingReminder(): Promise<
  { medicationId: string; patientId: string; medicationName: string; scheduledFor: Date; logId: string }[]
> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - GRACE_PERIOD_MS);
  const windowEnd = new Date(now.getTime() + DUE_WINDOW_MS);

  const medications = await prisma.medication.findMany({
    where: { isActive: true, startDate: { lte: now }, OR: [{ endDate: null }, { endDate: { gte: now } }] },
  });

  const results: { medicationId: string; patientId: string; medicationName: string; scheduledFor: Date; logId: string }[] = [];

  for (const med of medications) {
    const candidateTimes =
      med.scheduleType === 'SPECIFIC_DATES'
        ? med.specificDateTimes.filter((t) => t >= windowStart && t <= windowEnd)
        : recurringTimesForDay(med.timesOfDay, now).filter((t) => t >= windowStart && t <= windowEnd);

    for (const scheduledFor of candidateTimes) {
      const log = await prisma.medicationLog.upsert({
        where: { medicationId_scheduledFor: { medicationId: med.id, scheduledFor } },
        update: {},
        create: { medicationId: med.id, patientId: med.patientId, scheduledFor, status: 'PENDING' },
      });
      if (!log.reminderSentAt) {
        results.push({
          medicationId: med.id,
          patientId: med.patientId,
          medicationName: med.name,
          scheduledFor,
          logId: log.id,
        });
      }
    }
  }

  return results;
}

export async function markReminderSent(logId: string) {
  await prisma.medicationLog.update({ where: { id: logId }, data: { reminderSentAt: new Date() } });
}
