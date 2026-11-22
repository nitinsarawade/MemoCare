import { z } from 'zod';

export const uploadMediaBodySchema = z.object({
  assessmentTag: z.string().max(100).optional(),
  durationSeconds: z.coerce.number().int().positive().optional(),
  runAnalysis: z.coerce.boolean().optional(),
});

export const listMediaQuerySchema = z.object({
  mediaType: z.enum(['AUDIO', 'VIDEO']).optional(),
});
