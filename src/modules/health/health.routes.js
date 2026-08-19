import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { ok } from '../../lib/http.js';
import { query } from '../../db/query.js';
import { API_PHASE } from '../../config/constants.js';
import { embeddingsEnabled } from '../../lib/pgvector.js';
import { env } from '../../config/env.js';
import { cloudinaryConfigured } from '../../storage/cloudinary.js';

export const healthRouter = Router();

healthRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    ok(res, { status: 'ok', service: 'siteproof-api', phase: API_PHASE });
  }),
);

healthRouter.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    await query('SELECT 1');
    ok(res, {
      status: 'ready',
      db: 'up',
      phase: API_PHASE,
      pgvector: (await embeddingsEnabled()) ? 'up' : 'skipped',
      storage: env.STORAGE_DRIVER,
      cloudinary: cloudinaryConfigured() ? 'configured' : 'unset',
      openai: env.OPENAI_API_KEY ? 'set' : 'unset',
    });
  }),
);
