import bcrypt from 'bcryptjs';
import { query } from '../../db/query.js';
import { AppError } from '../../lib/AppError.js';
import { issueRefreshToken, signAccessToken } from '../../lib/tokens.js';
import { sha256 } from '../../lib/crypto.js';
import { publicUser } from '../../lib/serialize.js';

const USER_SQL = `
  SELECT u.id, u.org_id, u.email, u.name, u.role, u.is_active, u.password_hash,
         o.id AS org_table_id, o.name AS org_name
  FROM users u
  JOIN organizations o ON o.id = u.org_id
`;

function toUser(row) {
  return {
    user: {
      id: row.id,
      org_id: row.org_id,
      email: row.email,
      name: row.name,
      role: row.role,
      is_active: row.is_active,
      password_hash: row.password_hash,
    },
    org: { id: row.org_table_id, name: row.org_name },
  };
}

function tokenPayload(user, org) {
  return {
    accessToken: signAccessToken(user),
    refreshToken: undefined,
    user: publicUser(user, org),
  };
}

async function persistRefresh(userId, issued) {
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, issued.tokenHash, issued.expiresAt],
  );
}

export async function login({ email, password, client }) {
  const result = await query(`${USER_SQL} WHERE u.email_normalized = $1 AND u.is_active = true`, [
    email.trim().toLowerCase(),
  ]);
  const row = result.rows[0];
  if (!row) throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');

  const { user, org } = toUser(row);
  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');

  if (client === 'mobile' && user.role !== 'worker') {
    throw new AppError('This app is for field workers only', 403, 'FORBIDDEN');
  }
  if (client === 'office' && user.role === 'worker') {
    throw new AppError('Field work lives in the phone app', 403, 'FORBIDDEN');
  }

  const issued = issueRefreshToken();
  await persistRefresh(user.id, issued);
  return { ...tokenPayload(user, org), refreshToken: issued.token };
}

export async function refresh({ refreshToken }) {
  const tokenHash = sha256(refreshToken);
  const result = await query(
    `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at
     FROM refresh_tokens rt
     WHERE rt.token_hash = $1`,
    [tokenHash],
  );
  const stored = result.rows[0];
  if (!stored || stored.revoked_at || new Date(stored.expires_at) <= new Date()) {
    throw new AppError('Invalid or expired refresh token', 401, 'UNAUTHORIZED');
  }

  await query(`UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`, [stored.id]);

  const userRow = await query(`${USER_SQL} WHERE u.id = $1 AND u.is_active = true`, [stored.user_id]);
  if (!userRow.rows[0]) throw new AppError('Invalid or expired refresh token', 401, 'UNAUTHORIZED');

  const { user, org } = toUser(userRow.rows[0]);
  const issued = issueRefreshToken();
  await persistRefresh(user.id, issued);
  return { ...tokenPayload(user, org), refreshToken: issued.token };
}

export async function logout({ refreshToken }) {
  if (!refreshToken) return;
  await query(
    `UPDATE refresh_tokens SET revoked_at = now()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [sha256(refreshToken)],
  );
}

export async function me(userId) {
  const result = await query(`${USER_SQL} WHERE u.id = $1 AND u.is_active = true`, [userId]);
  if (!result.rows[0]) throw new AppError('User not found', 401, 'UNAUTHORIZED');
  const { user, org } = toUser(result.rows[0]);
  return publicUser(user, org);
}
