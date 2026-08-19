import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { chatSchema } from './query.schema.js';
import * as queryController from './query.controller.js';

export const queryRouter = Router();

queryRouter.post('/chat', authorize('query:chat'), validate(chatSchema), asyncHandler(queryController.chat));
