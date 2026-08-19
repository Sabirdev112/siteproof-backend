import { z } from 'zod';

export const createRulebookSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200),
    vertical: z.string().trim().max(50).optional(),
  }),
});

export const rulebookIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const searchRulebookSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  query: z
    .object({
      q: z.string().trim().min(1).max(300),
      limit: z.string().optional(),
    })
    .passthrough(),
});
