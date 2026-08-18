import 'dotenv/config';
import { z } from 'zod';

const csv = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MIGRATE_ON_START: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1'),

  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().positive().default(20),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  DB_CONN_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  CORS_ORIGINS: z.string().default('http://localhost:8081,http://localhost:3000').transform(csv),

  N8N_WEBHOOK_URL: z.union([z.string().url(), z.literal('')]).optional(),
  WEBHOOK_SECRET: z.string().min(16),
  N8N_API_KEY: z.string().min(16),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('uploads'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SKIP_PGVECTOR: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment:\n${details}`);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
