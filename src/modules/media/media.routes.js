import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { authorize } from '../../middleware/auth.js';
import { AppError } from '../../lib/AppError.js';
import { AUDIO_MAX_BYTES } from '../../lib/mediaTypes.js';
import * as mediaController from './media.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AUDIO_MAX_BYTES, files: 1 },
});

function singleFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large', 413, 'PAYLOAD_TOO_LARGE'));
    }
    return next(new AppError(err.message, 400, 'VALIDATION_ERROR'));
  });
}

export const mediaRouter = Router();

mediaRouter.post(
  '/',
  authorize('jobs:create'),
  singleFile,
  asyncHandler(mediaController.create),
);
mediaRouter.get('/:id', authorize('jobs:read:own'), asyncHandler(mediaController.getById));
