import { stubRouter } from '../createStubRouter.js';

export const authRouter = stubRouter(
  [
    ['post', '/login'],
    ['post', '/refresh'],
    ['post', '/logout'],
  ],
  'Phase 1',
);
