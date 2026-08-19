import { z } from 'zod';

export const reportIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const patchReportSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    reportId: z.string().uuid().optional(),
    jobId: z.string().uuid().optional(),
    status: z.enum(['pending', 'generating', 'ready', 'failed']),
    pdfStorageKey: z.string().max(500).nullable().optional(),
    pdfUrl: z.string().max(2000).nullable().optional(),
    error: z.string().max(500).optional(),
  }),
});
