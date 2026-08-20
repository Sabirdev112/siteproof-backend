import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
    client: z.enum(['mobile', 'office']).optional(),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});
