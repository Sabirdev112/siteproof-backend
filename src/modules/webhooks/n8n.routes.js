import { Router } from 'express';
import { authenticateN8n } from '../../middleware/auth.js';
import { stubRouter } from '../createStubRouter.js';

export const n8nWebhooksRouter = Router();
n8nWebhooksRouter.use(authenticateN8n);
n8nWebhooksRouter.use(
  stubRouter(
    [
      ['post', '/report-ready'],
      ['post', '/actions'],
    ],
    'Phase 7',
  ),
);
