import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { singleFileUpload } from '../../lib/upload.js';
import { PDF_MAX_BYTES } from '../../lib/mediaTypes.js';
import {
  createRulebookSchema,
  documentIdSchema,
  rulebookIdSchema,
  searchRulebookSchema,
} from './rulebooks.schema.js';
import * as rulebooksController from './rulebooks.controller.js';

const pdfUpload = singleFileUpload({ maxBytes: PDF_MAX_BYTES });

export const rulebooksRouter = Router();

rulebooksRouter.get('/', authorize('rulebooks:read'), asyncHandler(rulebooksController.list));
rulebooksRouter.post(
  '/',
  authorize('rulebooks:write'),
  validate(createRulebookSchema),
  asyncHandler(rulebooksController.create),
);
rulebooksRouter.get(
  '/:id/status',
  authorize('rulebooks:write'),
  validate(rulebookIdSchema),
  asyncHandler(rulebooksController.status),
);
rulebooksRouter.get(
  '/:id/search',
  authorize('rulebooks:read'),
  validate(searchRulebookSchema),
  asyncHandler(rulebooksController.search),
);
rulebooksRouter.post(
  '/:id/documents',
  authorize('rulebooks:write'),
  validate(rulebookIdSchema),
  pdfUpload,
  asyncHandler(rulebooksController.upload),
);
rulebooksRouter.delete(
  '/:id/documents/:documentId',
  authorize('rulebooks:write'),
  validate(documentIdSchema),
  asyncHandler(rulebooksController.removeDocument),
);
rulebooksRouter.get(
  '/:id',
  authorize('rulebooks:read'),
  validate(rulebookIdSchema),
  asyncHandler(rulebooksController.getById),
);
