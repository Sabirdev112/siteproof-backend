import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { addDuration } from './duration.js';
import { randomToken, sha256 } from './crypto.js';
import { AppError } from './AppError.js';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, orgId: user.org_id, role: user.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES },
  );
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch {
    throw new AppError('Invalid or expired access token', 401, 'UNAUTHORIZED');
  }
}

export function issueRefreshToken() {
  const token = randomToken();
  return {
    token,
    tokenHash: sha256(token),
    expiresAt: addDuration(new Date(), env.JWT_REFRESH_EXPIRES),
  };
}
