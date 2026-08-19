import { Router } from 'express';
import { ok } from '../../lib/http.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { authorize, authorizeOrN8n } from '../../middleware/auth.js';
import { createJobSchema, jobIdSchema, listJobsSchema, createFindingSchema } from './jobs.schema.js';
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
  authorizeOrN8n('jobs:read:own'),
  validate(jobIdSchema),
  asyncHandler(jobsController.getById),
);
jobsRouter.post(
  '/:id/close',
  authorize('jobs:close'),
  validate(jobIdSchema),
  asyncHandler(jobsController.close),
);
jobsRouter.post(
  '/:id/findings',
  authorize('jobs:create'),
  validate(createFindingSchema),
  asyncHandler(jobsController.addFinding),
);
jobsRouter.get(
  '/:id/actions',
  authorizeOrN8n('jobs:read:own'),
  validate(jobIdSchema),
  asyncHandler(async (req, res) => {
    const job = await jobsService.getJob(req.user, req.params.id, '', { n8n: req.n8n });
    return ok(res, job.actions);
  }),
);
