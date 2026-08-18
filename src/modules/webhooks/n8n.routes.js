import { stubRouter } from '../createStubRouter.js';

export const n8nWebhooksRouter = stubRouter(
  [
    ['post', '/report-ready'],
    ['post', '/actions'],
  ],
  'Phase 7',
);
