import { z } from 'zod';

export const createNoteSchema = z.object({
  body: z.string().min(1).max(5000),
  visibleToFamily: z.boolean().default(false),
});
