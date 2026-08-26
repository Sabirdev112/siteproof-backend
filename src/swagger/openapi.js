import { components } from './components.js';
import { healthPaths } from './paths/health.js';
import { authPaths } from './paths/auth.js';
import { webhooksPaths } from './paths/webhooks.js';
import { orgsPaths, settingsPaths } from './paths/orgs.js';
import { jobsPaths } from './paths/jobs.js';
import { rulebooksPaths } from './paths/rulebooks.js';
import {
  mediaPaths,
  extractionPaths,
  compliancePaths,
} from './paths/media.js';
import {
  reportsPaths,
  dashboardPaths,
  issuesPaths,
  queryPaths,
} from './paths/reports.js';

/** OpenAPI 3.0 document for SiteProof API (`/api/v1`). */
export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'SiteProof API',
    version: '0.1.0',
    description: [
      'Modular monolith for auth, jobs, rulebooks, extraction, compliance, reports, and n8n webhooks.',
      '',
      '### Auth',
      '- **Bearer JWT** — `Authorization: Bearer <accessToken>` for app users',
      '- **X-Api-Key** — n8n inbound callbacks (`N8N_API_KEY`)',
      '- Webhooks also require **X-Siteproof-Timestamp** (unix seconds)',
      '',
      '### Responses',
      'Success: `{ success: true, data }` · Error: `{ success: false, error: { code, message, details? }, requestId }`',
    ].join('\n'),
  },
  servers: [
    { url: '/api/v1', description: 'Current host' },
  ],
  tags: [
    { name: 'Health', description: 'Liveness and readiness' },
    { name: 'Auth', description: 'Login, tokens, current user' },
    { name: 'Webhooks', description: 'Inbound n8n callbacks' },
    { name: 'Organizations', description: 'Org profile and invites' },
    { name: 'Settings', description: 'Org settings blob' },
    { name: 'Jobs', description: 'Field jobs, findings, actions' },
    { name: 'Rulebooks', description: 'SOP rulebooks and PDF ingest' },
    { name: 'Media', description: 'Photo and audio uploads' },
    { name: 'Extraction', description: 'AI attribute extraction' },
    { name: 'Compliance', description: 'AI compliance verdicts' },
    { name: 'Reports', description: 'PDF report status' },
    { name: 'Dashboard', description: 'Supervisor summary' },
    { name: 'Issues', description: 'Fail/review follow-ups' },
    { name: 'Query', description: 'Rulebook Q&A' },
  ],
  paths: {
    ...healthPaths,
    ...authPaths,
    ...webhooksPaths,
    ...orgsPaths,
    ...settingsPaths,
    ...jobsPaths,
    ...rulebooksPaths,
    ...mediaPaths,
    ...extractionPaths,
    ...compliancePaths,
    ...reportsPaths,
    ...dashboardPaths,
    ...issuesPaths,
    ...queryPaths,
  },
  components,
};
