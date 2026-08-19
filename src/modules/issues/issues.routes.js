import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { listIssuesSchema, patchIssueSchema } from './issues.schema.js';
import * as issuesController from './issues.controller.js';

export const issuesRouter = Router();

issuesRouter.get('/', authorize('issues:manage'), validate(listIssuesSchema), asyncHandler(issuesController.list));
issuesRouter.patch(
  '/:id',
  authorize('issues:manage'),
  validate(patchIssueSchema),
  asyncHandler(issuesController.patch),
);
