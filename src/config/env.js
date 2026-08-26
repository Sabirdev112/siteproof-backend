import 'dotenv/config';
import { z } from 'zod';

const csv = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

/** Parse `user:pass,user2:pass2` into [{ username, password }, ...]. */
const docsUsers = (value) => {
  if (!value?.trim()) return [];
  return value.split(',').map((pair) => {
    const trimmed = pair.trim();
    const sep = trimmed.indexOf(':');
    if (sep <= 0 || sep === trimmed.length - 1) {
      throw new Error(`Invalid DOCS_USERS entry "${trimmed}" (expected user:password)`);
    }
    return {
      username: trimmed.slice(0, sep),
      password: trimmed.slice(sep + 1),
    };
  });
};

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MIGRATE_ON_START: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1'),

  // Swagger /docs Basic Auth. Example: you:secret,asad:another-secret
  DOCS_USERS: z
    .string()
    .default('')
    .superRefine((value, ctx) => {
      if (!value.trim()) return;
      for (const pair of value.split(',')) {
        const trimmed = pair.trim();
        if (!trimmed) continue;
        const sep = trimmed.indexOf(':');
        if (sep <= 0 || sep === trimmed.length - 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid entry "${trimmed}" (expected user:password)`,
          });
        }
      }
    })
    .transform((value) => docsUsers(value)),

  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().positive().default(20),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  DB_CONN_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(8_000),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  CORS_ORIGINS: z.string().default('http://localhost:8081,http://localhost:3000').transform(csv),

  N8N_WEBHOOK_URL: z.union([z.string().url(), z.literal('')]).optional(),
  WEBHOOK_SECRET: z.string().min(16),
  N8N_API_KEY: z.string().min(16),
  WEBHOOK_REPLAY_WINDOW_SECONDS: z.coerce.number().int().positive().default(300),
  QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(2),
  QUEUE_MAX_PENDING: z.coerce.number().int().positive().default(16),

  STORAGE_DRIVER: z.enum(['local', 'cloudinary']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('uploads'),
  CLOUDINARY_CLOUD_NAME: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  CLOUDINARY_API_KEY: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  CLOUDINARY_API_SECRET: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  CLOUDINARY_FOLDER: z.string().default('siteproof'),
  MEDIA_SIGN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  PUBLIC_API_URL: z.union([z.string().url(), z.literal('')]).optional(),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SKIP_PGVECTOR: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1'),
  OPENAI_API_KEY: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_VISION_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_TRANSCRIBE_MODEL: z.string().default('whisper-1'),
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
