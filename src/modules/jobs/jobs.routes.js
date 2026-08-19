import { Router } from 'express';
import { ok } from '../../lib/http.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { authorize } from '../../middleware/auth.js';
import { notImplemented } from '../../lib/AppError.js';
import { createJobSchema, jobIdSchema, listJobsSchema } from './jobs.schema.js';
import * as jobsController from './jobs.controller.js';
import * as jobsService from './jobs.service.js';

export const jobsRouter = Router();

jobsRouter.post(
  '/',
  authorize('jobs:create'),
  validate(createJobSchema),
  asyncHandler(jobsController.create),
);
jobsRouter.get(
  '/',
  authorize('jobs:read:own'),
  validate(listJobsSchema),
  asyncHandler(jobsController.list),
);
jobsRouter.get(
  '/:id',
  authorize('jobs:read:own'),
  validate(jobIdSchema),
  asyncHandler(jobsController.getById),
);
jobsRouter.post(
  '/:id/close',
  authorize('jobs:close'),
  asyncHandler(async () => {
    throw notImplemented('POST /jobs/:id/close (Phase 7)');
  }),
);
jobsRouter.post(
  '/:id/findings',
  authorize('jobs:create'),
  asyncHandler(async () => {
    throw notImplemented('POST /jobs/:id/findings (Phase 6)');
  }),
);
jobsRouter.get(
  '/:id/actions',
  authorize('jobs:read:own'),
  validate(jobIdSchema),
  asyncHandler(async (req, res) => {
    const job = await jobsService.getJob(req.user, req.params.id);
    return ok(res, job.actions);
  }),
);
