import { query } from '../../db/query.js';
import { AppError } from '../../lib/AppError.js';

function serializeIssue(row) {
  return {
    id: row.id,
    status: row.status,
    jobId: row.job_id,
    findingId: row.finding_id,
    site: row.site,
    verdict: row.verdict,
    severity: row.severity,
    reason: row.reason,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
  };
}

const ISSUE_SELECT = `
  SELECT i.id, i.status, i.job_id, i.finding_id, i.assigned_to, i.created_at,
         j.site, f.verdict, f.severity, f.reason
  FROM issues i
  JOIN jobs j ON j.id = i.job_id
  JOIN findings f ON f.id = i.finding_id
`;

export async function listIssues(user, queryParams, pagination) {
  const params = [user.org_id];
  const where = ['i.org_id = $1'];
  if (queryParams.status) {
    params.push(queryParams.status);
    where.push(`i.status = $${params.length}`);
  }
  const whereSql = where.join(' AND ');
  const count = await query(`SELECT COUNT(*)::int AS total FROM issues i WHERE ${whereSql}`, params);
  params.push(pagination.limit, pagination.offset);
  const rows = await query(
    `${ISSUE_SELECT}
     WHERE ${whereSql}
     ORDER BY i.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { items: rows.rows.map(serializeIssue), total: count.rows[0].total, ...pagination };
}

export async function patchIssue(user, id, body) {
  const existing = await query(`${ISSUE_SELECT} WHERE i.id = $1 AND i.org_id = $2`, [id, user.org_id]);
  if (!existing.rows[0]) throw new AppError('Issue not found', 404, 'NOT_FOUND');

  let assignedTo = body.assignedTo ?? existing.rows[0].assigned_to;
  if (body.status === 'open') assignedTo = null;
  if (body.status === 'assigned') {
    const member = await query(`SELECT id FROM users WHERE id = $1 AND org_id = $2 AND is_active = true`, [
      assignedTo,
      user.org_id,
    ]);
    if (!member.rows[0]) throw new AppError('Assignee not found in this org', 400, 'VALIDATION_ERROR');
  }

  const resolvedAt = body.status === 'resolved' ? new Date() : null;
  const updated = await query(
    `UPDATE issues
     SET status = $2, assigned_to = $3, resolved_at = $4
     WHERE id = $1 AND org_id = $5
     RETURNING id`,
    [id, body.status, assignedTo, resolvedAt, user.org_id],
  );
  const row = await query(`${ISSUE_SELECT} WHERE i.id = $1`, [updated.rows[0].id]);
  return serializeIssue(row.rows[0]);
}
