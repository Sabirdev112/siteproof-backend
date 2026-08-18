import { stubRouter } from '../createStubRouter.js';

export const rulebooksRouter = stubRouter(
  [
    ['get', '/'],
    ['post', '/'],
    ['get', '/:id'],
    ['post', '/:id/documents'],
    ['get', '/:id/status'],
    ['get', '/:id/search'],
  ],
  'Phase 4',
);
