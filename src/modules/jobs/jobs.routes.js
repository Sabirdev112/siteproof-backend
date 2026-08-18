import { stubRouter } from '../createStubRouter.js';

export const jobsRouter = stubRouter(
  [
    ['post', '/'],
    ['get', '/'],
    ['get', '/:id'],
    ['post', '/:id/close'],
    ['post', '/:id/findings'],
    ['get', '/:id/actions'],
  ],
  'Phase 2 / 7',
);
