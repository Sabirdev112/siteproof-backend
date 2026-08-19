import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { authorize } from '../../middleware/auth.js';
import { singleFileUpload } from '../../lib/upload.js';
import { AUDIO_MAX_BYTES } from '../../lib/mediaTypes.js';
import * as mediaController from './media.controller.js';

const singleFile = singleFileUpload({ maxBytes: AUDIO_MAX_BYTES });

export const mediaRouter = Router();

mediaRouter.post('/', authorize('jobs:create'), singleFile, asyncHandler(mediaController.create));
mediaRouter.get('/:id', authorize('jobs:read:own'), asyncHandler(mediaController.getById));
