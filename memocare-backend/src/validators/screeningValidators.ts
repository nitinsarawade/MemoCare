import { z } from 'zod';

export const submitAttemptSchema = z.object({
  testId: z.string().uuid(),
  answers: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        givenAnswer: z.any(),
      })
    )
    .min(1),
});

export const createTestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  testType: z.enum([
    'MMSE_STYLE',
    'MOCA_STYLE',
    'NAME_THE_OBJECTS',
    'WORD_RECALL',
    'ORIENTATION',
    'PATTERN_MEMORY',
    'CUSTOM',
  ]),
  // Optional random-pool size: each attempt shows this many items drawn at
  // random from the test's full item list. Must not exceed the item count
  // (checked in the controller, since this schema is a plain z.object).
  itemsPerAttempt: z.number().int().positive().optional(),
  items: z
    .array(
      z.object({
        order: z.number().int().nonnegative(),
        prompt: z.string().min(1),
        itemType: z.enum(['text_answer', 'multiple_choice', 'image_naming', 'word_recall', 'pattern_sequence']),
        choices: z.array(z.string()).optional(),
        correctAnswer: z.any(),
        mediaKey: z.string().optional(),
        points: z.number().int().positive().default(1),
      })
    )
    .min(1),
});
