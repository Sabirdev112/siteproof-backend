import { z } from 'zod';

const uuid = z.string().uuid();

const attributes = z.object({
  object: z.string().trim().max(200).optional().default(''),
  condition: z.string().trim().max(200).optional().default(''),
  location: z.string().trim().max(200).optional().default(''),
  apparentIssue: z.string().trim().max(200).optional().default(''),
});

export const checkComplianceSchema = z.object({
  body: z.object({
    jobId: uuid,
    rulebookId: uuid.optional(),
    transcript: z.string().max(8000).optional().default(''),
    attributes,
  }),
});
