import { z } from 'zod';

const optionalUuid = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.string().uuid().optional(),
);

export const createJobSchema = z.object({
  body: z.object({
    site: z.string().trim().min(1).max(500),
    jobType: z.string().trim().max(100).optional(),
    rulebookId: optionalUuid,
  }),
});

export const listJobsSchema = z.object({
  query: z
    .object({
      status: z.enum(['open', 'closed']).optional(),
      site: z.string().optional(),
      workerId: optionalUuid,
      from: z.string().optional(),
      to: z.string().optional(),
      q: z.string().optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    })
    .passthrough(),
});

export const jobIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
