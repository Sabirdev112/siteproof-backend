import { AppError } from '../../lib/AppError.js';
import { query } from '../../db/query.js';
import { serializeReport } from '../../lib/serialize.js';

export async function getReport(user, id, { n8n } = {}) {
  const result = await query(
    `SELECT r.id, r.job_id, r.status, r.pdf_storage_key, j.org_id
     FROM reports r
     JOIN jobs j ON j.id = r.job_id
     WHERE r.id = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) throw new AppError('Report not found', 404, 'NOT_FOUND');
  if (!n8n && row.org_id !== user.org_id) throw new AppError('Report not found', 404, 'NOT_FOUND');
  return serializeReport(row);
}

export async function patchReport(id, body) {
  const result = await query(`SELECT r.*, j.org_id FROM reports r JOIN jobs j ON j.id = r.job_id WHERE r.id = $1`, [
    id,
  ]);
  if (!result.rows[0]) throw new AppError('Report not found', 404, 'NOT_FOUND');
  if (body.jobId && body.jobId !== result.rows[0].job_id) {
    throw new AppError('reportId does not match jobId', 400, 'VALIDATION_ERROR');
  }

  const key = body.pdfStorageKey || body.pdfUrl || result.rows[0].pdf_storage_key;
  const updated = await query(
    `UPDATE reports SET status = $2, pdf_storage_key = $3 WHERE id = $1
     RETURNING id, job_id, status, pdf_storage_key`,
    [id, body.status, key ?? null],
  );
  return serializeReport(updated.rows[0]);
}
