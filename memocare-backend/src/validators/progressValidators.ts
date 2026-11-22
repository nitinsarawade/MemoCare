import { z } from 'zod';

export const progressQuerySchema = z.object({
  from: z.string().refine((v) => !isNaN(Date.parse(v)), 'from must be a valid date').optional(),
  to: z.string().refine((v) => !isNaN(Date.parse(v)), 'to must be a valid date').optional(),
});
