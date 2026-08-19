import { z } from 'zod';

export const patchOrgSchema = z.object({
  body: z
    .object({
      name: z.string().min(1).max(200).optional(),
      vertical: z.string().max(100).nullable().optional(),
      branding: z.record(z.unknown()).optional(),
    })
    .refine((body) => Object.keys(body).length > 0, { message: 'No fields to update' }),
});

export const patchSettingsSchema = z.object({
  body: z.record(z.unknown()).refine((body) => Object.keys(body).length > 0, {
    message: 'No fields to update',
  }),
});
