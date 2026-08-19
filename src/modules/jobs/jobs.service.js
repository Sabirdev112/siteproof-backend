import { query, withTransaction } from '../../db/query.js';
import { AppError } from '../../lib/AppError.js';
import { findIdempotentResponse, saveIdempotentResponse } from '../../lib/idempotency.js';
import { jobSummary } from '../../lib/serialize.js';

const canReadAll = (role) => role === 'supervisor' || role === 'owner';

async function defaultRulebookId(orgId, requestedId) {
  if (requestedId) {
    const found = await query(
      `SELECT id FROM rulebooks WHERE id = $1 AND org_id = $2`,
      [requestedId, orgId],
    );
    if (!found.rows[0]) throw new AppError('Rulebook not found', 404, 'NOT_FOUND');
    return requestedId;
  }

  const result = await query(
    `SELECT id FROM rulebooks WHERE org_id = $1 ORDER BY created_at ASC LIMIT 2`,
    [orgId],
  );
  if (result.rows.length === 1) return result.rows[0].id;
  return null;
}

function visibilityWhere(user, { workerId } = {}) {
  if (canReadAll(user.role)) {
    return {
      sql: 'j.org_id = $1',
      params: [user.org_id],
      workerFilter: workerId || null,
    };
  }
  return {
    sql: 'j.org_id = $1 AND j.worker_id = $2',
    params: [user.org_id, user.id],
    workerFilter: null,
  };
}

const SUMMARY_SELECT = `
  SELECT
    j.id, j.site, j.job_type, j.rulebook_id, j.status, j.created_at, j.closed_at,
    j.worker_id, u.name AS worker_name,
    COUNT(f.id)::int AS finding_count,
    COUNT(f.id) FILTER (WHERE f.verdict = 'pass')::int AS pass_count,
    COUNT(f.id) FILTER (WHERE f.verdict = 'review')::int AS review_count,
    COUNT(f.id) FILTER (WHERE f.verdict = 'fail')::int AS fail_count
  FROM jobs j
  JOIN users u ON u.id = j.worker_id
  LEFT JOIN findings f ON f.job_id = j.id
`;

export async function createJob(user, body, { idempotencyKey, method, path } = {}) {
  if (idempotencyKey) {
    const replay = await findIdempotentResponse(user.id, idempotencyKey);
    if (replay) return { replay: true, status: replay.response_status, data: replay.response_body.data };
  }

  const rulebookId = await defaultRulebookId(user.org_id, body.rulebookId);

  return withTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO jobs (org_id, worker_id, rulebook_id, site, job_type, status)
       VALUES ($1, $2, $3, $4, $5, 'open')
       RETURNING id, site, job_type, rulebook_id, status, created_at, closed_at`,
      [user.org_id, user.id, rulebookId, body.site, body.jobType ?? null],
    );
    const row = inserted.rows[0];
    const data = {
      id: row.id,
      site: row.site,
      jobType: row.job_type,
      rulebookId: row.rulebook_id,
      status: row.status,
      createdAt: row.created_at,
    };

    if (idempotencyKey) {
      await saveIdempotentResponse(client, {
        userId: user.id,
        key: idempotencyKey,
        method,
        path,
        status: 201,
        body: { success: true, data },
      });
    }

    return { replay: false, status: 201, data };
  });
}

export async function listJobs(user, queryParams, pagination) {
  const vis = visibilityWhere(user, { workerId: queryParams.workerId });
  const params = [...vis.params];
  const where = [vis.sql];

  if (vis.workerFilter) {
    params.push(vis.workerFilter);
    where.push(`j.worker_id = $${params.length}`);
  }
  if (queryParams.status) {
    params.push(queryParams.status);
    where.push(`j.status = $${params.length}`);
  }
  if (queryParams.site) {
    params.push(`%${queryParams.site}%`);
    where.push(`j.site ILIKE $${params.length}`);
  }
  if (queryParams.q) {
    params.push(`%${queryParams.q}%`);
    where.push(`(j.site ILIKE $${params.length} OR COALESCE(j.job_type, '') ILIKE $${params.length})`);
  }
  if (queryParams.from) {
    params.push(queryParams.from);
    where.push(`j.created_at >= $${params.length}::timestamptz`);
  }
  if (queryParams.to) {
    params.push(queryParams.to);
    where.push(`j.created_at <= $${params.length}::timestamptz`);
  }

  const whereSql = where.join(' AND ');
  const count = await query(`SELECT COUNT(*)::int AS total FROM jobs j WHERE ${whereSql}`, params);
  params.push(pagination.limit, pagination.offset);
  const rows = await query(
    `${SUMMARY_SELECT}
     WHERE ${whereSql}
     GROUP BY j.id, u.id
     ORDER BY j.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return {
    items: rows.rows.map(jobSummary),
    total: count.rows[0].total,
    ...pagination,
  };
}

export async function getJob(user, id) {
  const vis = visibilityWhere(user);
  const params = [...vis.params, id];
  const result = await query(
    `${SUMMARY_SELECT}
     WHERE ${vis.sql} AND j.id = $${params.length}
     GROUP BY j.id, u.id`,
    params,
  );
  const row = result.rows[0];
  if (!row) throw new AppError('Job not found', 404, 'NOT_FOUND');

  const findings = await query(
    `SELECT id, media_ids, transcript, attributes, verdict, severity, cited_clause, reason, created_at
     FROM findings WHERE job_id = $1 ORDER BY created_at ASC`,
    [id],
  );
  const report = await query(
    `SELECT id, status, pdf_storage_key FROM reports WHERE job_id = $1`,
    [id],
  );
  const actions = await query(
    `SELECT id, type, target, status, metadata, created_at
     FROM actions WHERE job_id = $1 ORDER BY created_at ASC`,
    [id],
  );

  const reportRow = report.rows[0];
  return {
    ...jobSummary(row),
    findings: findings.rows.map((finding) => ({
      id: finding.id,
      mediaIds: finding.media_ids ?? [],
      transcript: finding.transcript,
      attributes: finding.attributes ?? {},
      verdict: finding.verdict,
      severity: finding.severity,
      citedClause: finding.cited_clause,
      reason: finding.reason,
      createdAt: finding.created_at,
    })),
    report: reportRow
      ? {
          id: reportRow.id,
          status: reportRow.status,
          pdfUrl: null,
          pdfStorageKey: reportRow.pdf_storage_key,
        }
      : null,
    actions: actions.rows.map((action) => ({
      id: action.id,
      type: action.type,
      target: action.target,
      status: action.status,
      metadata: action.metadata ?? {},
      createdAt: action.created_at,
    })),
  };
}
