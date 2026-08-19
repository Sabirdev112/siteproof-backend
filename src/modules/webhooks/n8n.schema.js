import { z } from 'zod';

export const reportReadySchema = z.object({
  body: z.object({
    reportId: z.string().uuid(),
    jobId: z.string().uuid().optional(),
    status: z.enum(['pending', 'generating', 'ready', 'failed']),
    pdfStorageKey: z.string().max(500).nullable().optional(),
    pdfUrl: z.string().max(2000).nullable().optional(),
    error: z.string().max(500).optional(),
  }),
});

export const n8nActionSchema = z.object({
  body: z.object({
    jobId: z.string().uuid(),
    type: z.string().trim().min(1).max(80),
    target: z.string().trim().max(200).optional().nullable(),
    status: z.enum(['ok', 'failed', 'skipped']),
    metadata: z.record(z.any()).optional().default({}),
  }),
});
