import { z } from 'zod';

const uuid = z.string().uuid();

export const extractSchema = z.object({
  body: z.object({
    jobId: uuid,
    mediaIds: z.array(uuid).min(1),
    audioId: uuid.optional(),
  }),
});
