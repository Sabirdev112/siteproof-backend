import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notImplemented } from '../lib/AppError.js';
import { healthRouter } from './health/health.routes.js';
import { authRouter } from './auth/auth.routes.js';
import { orgsRouter } from './orgs/orgs.routes.js';
import { rulebooksRouter } from './rulebooks/rulebooks.routes.js';
import { mediaRouter } from './media/media.routes.js';
import { extractionRouter } from './extraction/extraction.routes.js';
import { complianceRouter } from './compliance/compliance.routes.js';
import { jobsRouter } from './jobs/jobs.routes.js';
import { reportsRouter } from './reports/reports.routes.js';
import { dashboardRouter } from './dashboard/dashboard.routes.js';
import { issuesRouter } from './issues/issues.routes.js';
import { queryRouter } from './query/query.routes.js';
import { settingsRouter } from './settings/settings.routes.js';
import { n8nWebhooksRouter } from './webhooks/n8n.routes.js';

export const api = Router();

api.use('/health', healthRouter);
api.use('/auth', authRouter);
api.get(
  '/me',
  asyncHandler(async () => {
    throw notImplemented('GET /me (Phase 1)');
  }),
);
api.use('/orgs', orgsRouter);
api.use('/rulebooks', rulebooksRouter);
api.use('/media', mediaRouter);
api.use('/extract', extractionRouter);
api.use('/compliance', complianceRouter);
api.use('/jobs', jobsRouter);
api.use('/reports', reportsRouter);
api.use('/dashboard', dashboardRouter);
api.use('/issues', issuesRouter);
api.use('/query', queryRouter);
api.use('/settings', settingsRouter);
api.use('/webhooks/n8n', n8nWebhooksRouter);
