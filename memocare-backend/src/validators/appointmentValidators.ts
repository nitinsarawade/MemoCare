import { z } from 'zod';

export const createAppointmentSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
  scheduledFor: z.string().refine((v) => !isNaN(Date.parse(v)), 'scheduledFor must be a valid date-time'),
});

export const updateAppointmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(2000).optional(),
  scheduledFor: z.string().refine((v) => !isNaN(Date.parse(v)), 'scheduledFor must be a valid date-time').optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED']).optional(),
});
