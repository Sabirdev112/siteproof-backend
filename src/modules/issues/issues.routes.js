import { stubRouter } from '../createStubRouter.js';

export const issuesRouter = stubRouter(
  [
    ['get', '/'],
    ['patch', '/:id'],
  ],
  'Phase 8',
);
