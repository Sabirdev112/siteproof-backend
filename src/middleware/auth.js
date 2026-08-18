import { AppError, notImplemented } from '../lib/AppError.js';
import { PERMISSIONS } from '../config/constants.js';

/** Wired in Phase 1. Rejects so unfinished routes are never accidentally open. */
export function authenticate(_req, _res, next) {
  next(notImplemented('Authentication (Phase 1)'));
}

export function authorize(permission) {
  return (req, _res, next) => {
    const allowed = PERMISSIONS[permission];
    if (!allowed) {
      return next(new AppError(`Unknown permission ${permission}`, 500, 'CONFIG_ERROR'));
    }
    if (!req.user || !allowed.includes(req.user.role)) {
      return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
    }
    next();
  };
}

export function authenticateN8n(req, _res, next) {
  next(notImplemented('n8n service auth (Phase 7)'));
}
