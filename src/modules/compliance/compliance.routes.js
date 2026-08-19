import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { checkComplianceSchema } from './compliance.schema.js';
import * as complianceController from './compliance.controller.js';

export const complianceRouter = Router();

complianceRouter.post(
  '/check',
  authorize('jobs:create'),
  validate(checkComplianceSchema),
  asyncHandler(complianceController.check),
);
