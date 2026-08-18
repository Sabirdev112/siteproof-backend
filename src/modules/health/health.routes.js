import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { ok } from '../../lib/http.js';
import { query } from '../../db/query.js';

export const healthRouter = Router();

healthRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    ok(res, { status: 'ok', service: 'siteproof-api', phase: 0 });
  }),
);

healthRouter.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    await query('SELECT 1');
    ok(res, { status: 'ready', db: 'up' });
  }),
);
