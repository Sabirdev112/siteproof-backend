import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { authorize } from '../../middleware/auth.js';
import * as dashboardController from './dashboard.controller.js';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', authorize('dashboard:read'), asyncHandler(dashboardController.summary));
