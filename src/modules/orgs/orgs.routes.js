import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { authorize } from '../../middleware/auth.js';
import { notImplemented } from '../../lib/AppError.js';
import { patchOrgSchema } from './orgs.schema.js';
import * as orgsController from './orgs.controller.js';

export const orgsRouter = Router();

orgsRouter.get('/me', authorize('org:read'), asyncHandler(orgsController.getMine));
orgsRouter.patch(
  '/me',
  authorize('org:write'),
  validate(patchOrgSchema),
  asyncHandler(orgsController.updateMine),
);
orgsRouter.post(
  '/:id/invite',
  authorize('team:invite'),
  asyncHandler(async () => {
    throw notImplemented('POST /orgs/:id/invite (Later)');
  }),
);
