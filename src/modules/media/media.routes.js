import { stubRouter } from '../createStubRouter.js';

export const mediaRouter = stubRouter(
  [
    ['post', '/'],
    ['get', '/:id'],
  ],
  'Phase 3',
);
