import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { authorizeOrN8n } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { AppError } from '../../lib/AppError.js';
import { reportIdSchema, patchReportSchema } from './reports.schema.js';
import * as reportsController from './reports.controller.js';

export const reportsRouter = Router();

reportsRouter.get(
  '/:id',
  authorizeOrN8n('jobs:read:own'),
  validate(reportIdSchema),
  asyncHandler(reportsController.getById),
);

reportsRouter.patch(
  '/:id',
  (req, _res, next) => {
    if (!req.n8n) return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
    next();
  },
  validate(patchReportSchema),
  asyncHandler(reportsController.patch),
);
