import { stubRouter } from '../createStubRouter.js';

export const orgsRouter = stubRouter(
  [
    ['get', '/me'],
    ['patch', '/me'],
    ['post', '/:id/invite'],
  ],
  'Phase 1',
);
