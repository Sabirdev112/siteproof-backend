import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { authenticateN8n } from '../../middleware/auth.js';
import { webhookLimiter } from '../../middleware/rateLimit.js';
import { webhookReplayWindow } from '../../middleware/webhookReplay.js';
import { validate } from '../../middleware/validate.js';
import { reportReadySchema, n8nActionSchema } from './n8n.schema.js';
import * as n8nController from './n8n.controller.js';

export const n8nWebhooksRouter = Router();
n8nWebhooksRouter.use(webhookLimiter);
n8nWebhooksRouter.use(authenticateN8n);
n8nWebhooksRouter.use(webhookReplayWindow);
n8nWebhooksRouter.post(
  '/report-ready',
  validate(reportReadySchema),
  asyncHandler(n8nController.reportReady),
);
n8nWebhooksRouter.post('/actions', validate(n8nActionSchema), asyncHandler(n8nController.actions));
