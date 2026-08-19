import { z } from 'zod';

const optionalUuid = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.string().uuid().optional(),
);

export const listIssuesSchema = z.object({
  query: z
    .object({
      status: z.enum(['open', 'assigned', 'resolved']).optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    })
    .passthrough(),
});

export const issueIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const patchIssueSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      status: z.enum(['open', 'assigned', 'resolved']),
      assignedTo: optionalUuid,
    })
    .refine((body) => body.status !== 'assigned' || body.assignedTo, {
      message: 'assignedTo is required when status is assigned',
    }),
});
