import { AppError } from '../../lib/AppError.js';
import { query } from '../../db/query.js';
import * as reportsService from '../reports/reports.service.js';

export async function reportReady(body) {
  return reportsService.patchReport(body.reportId, body);
}

export async function logAction(body) {
  const job = await query(`SELECT id FROM jobs WHERE id = $1`, [body.jobId]);
  if (!job.rows[0]) throw new AppError('Job not found', 404, 'NOT_FOUND');

  const existing = await query(
    `SELECT id, type, target, status, metadata, created_at
     FROM actions
     WHERE job_id = $1 AND type = $2 AND COALESCE(target, '') = COALESCE($3, '') AND status = $4
     ORDER BY created_at ASC
     LIMIT 1`,
    [body.jobId, body.type, body.target || null, body.status],
  );
  if (existing.rows[0]) {
    const row = existing.rows[0];
    return {
      id: row.id,
      type: row.type,
      target: row.target,
      status: row.status,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
    };
  }

  const inserted = await query(
    `INSERT INTO actions (job_id, type, target, status, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id, type, target, status, metadata, created_at`,
    [body.jobId, body.type, body.target || null, body.status, JSON.stringify(body.metadata || {})],
  );
  const row = inserted.rows[0];
  return {
    id: row.id,
    type: row.type,
    target: row.target,
    status: row.status,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}
