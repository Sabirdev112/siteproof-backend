import { stubRouter } from '../createStubRouter.js';

export const reportsRouter = stubRouter(
  [
    ['get', '/:id'],
    ['patch', '/:id'],
  ],
  'Phase 7',
);
