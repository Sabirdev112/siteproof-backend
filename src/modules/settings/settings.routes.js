import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { authorize } from '../../middleware/auth.js';
import { patchSettingsSchema } from '../orgs/orgs.schema.js';
import * as orgsController from '../orgs/orgs.controller.js';

export const settingsRouter = Router();

settingsRouter.get('/', authorize('settings:read'), asyncHandler(orgsController.getSettings));
settingsRouter.patch(
  '/',
  authorize('settings:write'),
  validate(patchSettingsSchema),
  asyncHandler(orgsController.updateSettings),
);
