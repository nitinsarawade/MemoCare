import { z } from 'zod';

export const submitFamilyQuizSchema = z.object({
  answers: z
    .array(
      z.object({
        familyMemberId: z.string().uuid(),
        givenAnswer: z.string().max(200),
      })
    )
    .min(1)
    .max(10),
});
