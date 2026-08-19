import { query } from '../../db/query.js';
import { AppError } from '../../lib/AppError.js';
import { publicOrg } from '../../lib/serialize.js';

export async function getMine(orgId) {
  const result = await query(
    `SELECT id, name, vertical, plan, branding, created_at, updated_at
     FROM organizations WHERE id = $1`,
    [orgId],
  );
  if (!result.rows[0]) throw new AppError('Organisation not found', 404, 'NOT_FOUND');
  return publicOrg(result.rows[0]);
}

export async function updateMine(orgId, { name, vertical, branding }) {
  const result = await query(
    `UPDATE organizations
     SET
       name = COALESCE($2, name),
       vertical = COALESCE($3, vertical),
       branding = CASE WHEN $4::jsonb IS NULL THEN branding ELSE branding || $4::jsonb END
     WHERE id = $1
     RETURNING id, name, vertical, plan, branding, created_at, updated_at`,
    [orgId, name ?? null, vertical ?? null, branding ? JSON.stringify(branding) : null],
  );
  if (!result.rows[0]) throw new AppError('Organisation not found', 404, 'NOT_FOUND');
  return publicOrg(result.rows[0]);
}

export async function getSettings(orgId) {
  const result = await query(`SELECT settings FROM organizations WHERE id = $1`, [orgId]);
  if (!result.rows[0]) throw new AppError('Organisation not found', 404, 'NOT_FOUND');
  return result.rows[0].settings ?? {};
}

export async function updateSettings(orgId, patch) {
  const result = await query(
    `UPDATE organizations
     SET settings = settings || $2::jsonb
     WHERE id = $1
     RETURNING settings`,
    [orgId, JSON.stringify(patch)],
  );
  if (!result.rows[0]) throw new AppError('Organisation not found', 404, 'NOT_FOUND');
  return result.rows[0].settings ?? {};
}
