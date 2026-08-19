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
      headline: z.enum(['open', 'pass', 'review', 'fail']).optional(),
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

const citedClause = z.object({
  ref: z.string().trim().min(1).max(80),
  text: z.string().trim().min(1).max(500),
});

export const createFindingSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    mediaIds: z.array(z.string().uuid()).min(1),
    audioId: optionalUuid,
    transcript: z.string().max(8000).optional().default(''),
    attributes: z.object({
      object: z.string().trim().max(200).optional().default(''),
      condition: z.string().trim().max(200).optional().default(''),
      location: z.string().trim().max(200).optional().default(''),
      apparentIssue: z.string().trim().max(200).optional().default(''),
    }),
    verdict: z.enum(['pass', 'review', 'fail']),
    severity: z.enum(['low', 'med', 'high']),
    citedClause,
    reason: z.string().trim().min(1).max(800),
  }),
});
