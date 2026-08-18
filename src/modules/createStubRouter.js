import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notImplemented } from '../lib/AppError.js';

export function stubRouter(routes, phaseLabel) {
  const router = Router({ mergeParams: true });
  for (const [method, path] of routes) {
    router[method](
      path,
      asyncHandler(async () => {
        throw notImplemented(`${method.toUpperCase()} ${path} (${phaseLabel})`);
      }),
    );
  }
  return router;
}
