import { z } from 'zod';

export const chatSchema = z.object({
  body: z.object({
    rulebookId: z.string().uuid(),
    message: z.string().trim().min(1).max(2000),
  }),
});
