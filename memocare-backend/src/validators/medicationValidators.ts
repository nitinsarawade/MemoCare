import { z } from 'zod';

const timeOfDayRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // "HH:mm", 24h

const baseMedicationFields = {
  name: z.string().min(1).max(200),
  dosage: z.string().max(200).optional(),
  instructions: z.string().max(500).optional(),
  startDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'startDate must be a valid date'),
  endDate: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), 'endDate must be a valid date')
    .optional(),
};

// Two schedule shapes: RECURRING_DAILY (repeats every day at each HH:mm
// in timesOfDay) or SPECIFIC_DATES (fires only on exact date/month/year
// date-times you list — for a one-off or non-daily prescription).
export const createMedicationSchema = z.discriminatedUnion('scheduleType', [
  z.object({
    scheduleType: z.literal('RECURRING_DAILY'),
    timesOfDay: z.array(z.string().regex(timeOfDayRegex, 'must be "HH:mm" 24-hour time')).min(1),
    ...baseMedicationFields,
  }),
  z.object({
    scheduleType: z.literal('SPECIFIC_DATES'),
    specificDateTimes: z
      .array(z.string().refine((v) => !isNaN(Date.parse(v)), 'must be a valid ISO date-time'))
      .min(1)
      .max(50),
    ...baseMedicationFields,
  }),
]);

export const updateMedicationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  dosage: z.string().max(200).optional(),
  instructions: z.string().max(500).optional(),
  scheduleType: z.enum(['RECURRING_DAILY', 'SPECIFIC_DATES']).optional(),
  timesOfDay: z.array(z.string().regex(timeOfDayRegex, 'must be "HH:mm" 24-hour time')).min(1).optional(),
  specificDateTimes: z
    .array(z.string().refine((v) => !isNaN(Date.parse(v)), 'must be a valid ISO date-time'))
    .min(1)
    .max(50)
    .optional(),
  startDate: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), 'startDate must be a valid date')
    .optional(),
  endDate: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), 'endDate must be a valid date')
    .optional(),
  isActive: z.boolean().optional(),
});

export const logDoseSchema = z.object({
  scheduledFor: z.string().refine((v) => !isNaN(Date.parse(v)), 'scheduledFor must be a valid date-time'),
  status: z.enum(['TAKEN', 'MISSED', 'SKIPPED']),
  takenAt: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), 'takenAt must be a valid date-time')
    .optional(),
});
