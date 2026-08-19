import { AppError } from '../lib/AppError.js';
import { PERMISSIONS } from '../config/constants.js';
import { verifyAccessToken } from '../lib/tokens.js';
import { query } from '../db/query.js';
import { env } from '../config/env.js';
import { safeEqual } from '../lib/crypto.js';

export async function authenticate(req, _res, next) {
  try {
    const apiKey = req.header('x-api-key') || '';
    if (apiKey) {
      if (!safeEqual(apiKey, env.N8N_API_KEY)) {
        throw new AppError('Invalid API key', 401, 'UNAUTHORIZED');
      }
      req.n8n = true;
      return next();
    }

    const header = req.header('authorization') || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AppError('Missing bearer token', 401, 'UNAUTHORIZED');
    }

    const payload = verifyAccessToken(token);
    const result = await query(
      `SELECT id, org_id, email, name, role, is_active
       FROM users
       WHERE id = $1`,
      [payload.sub],
    );
    const user = result.rows[0];
    if (!user || !user.is_active) {
      throw new AppError('Invalid or expired access token', 401, 'UNAUTHORIZED');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(permission) {
  return (req, _res, next) => {
    if (req.n8n) {
      return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
    }
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

export function authorizeOrN8n(permission) {
  return (req, res, next) => {
    if (req.n8n) return next();
    return authorize(permission)(req, res, next);
  };
}

export function authenticateN8n(req, _res, next) {
  const provided = req.header('x-api-key') || '';
  if (!provided || !safeEqual(provided, env.N8N_API_KEY)) {
    return next(new AppError('Invalid API key', 401, 'UNAUTHORIZED'));
  }
  next();
}
