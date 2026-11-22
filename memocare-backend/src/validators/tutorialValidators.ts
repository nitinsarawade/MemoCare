import { z } from 'zod';

export const createTutorialSchema = z.object({
  slug: z.string().min(1).max(150).regex(/^[a-z0-9-]+$/, 'slug must be lowercase, alphanumeric, and hyphenated'),
  title: z.string().min(1).max(200),
  bodyMarkdown: z.string().min(1),
  videoKey: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
  isPublished: z.boolean().optional(),
});

export const updateTutorialSchema = createTutorialSchema.omit({ slug: true }).partial();
