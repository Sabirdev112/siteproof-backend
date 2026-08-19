import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { ok } from '../../lib/http.js';
import { query } from '../../db/query.js';
import { API_PHASE } from '../../config/constants.js';

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
    ok(res, { status: 'ready', db: 'up' });
  }),
);
