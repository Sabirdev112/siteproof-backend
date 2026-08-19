import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { extractSchema } from './extraction.schema.js';
import * as extractionController from './extraction.controller.js';

export const extractionRouter = Router();

extractionRouter.post(
  '/',
  authorize('jobs:create'),
  validate(extractSchema),
  asyncHandler(extractionController.extract),
);
