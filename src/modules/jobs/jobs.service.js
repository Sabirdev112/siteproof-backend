import { query, withTransaction } from '../../db/query.js';
import { AppError } from '../../lib/AppError.js';
import { findIdempotentResponse, saveIdempotentResponse } from '../../lib/idempotency.js';
import { jobSummary, serializeReport } from '../../lib/serialize.js';
import { urlsForMediaIds, audioFromMediaIds } from '../media/media.service.js';
import { storage } from '../../storage/index.js';
import { ai } from '../../ai/index.js';
import { queues } from '../../queues/index.js';
import { enqueue } from '../../events/outbox.js';
import { buildJobClosedPayload, newOutboxId } from '../../events/payload.js';

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

  const ready = await query(
    `SELECT id FROM rulebooks WHERE org_id = $1 AND status = 'ready' ORDER BY created_at ASC LIMIT 2`,
    [orgId],
  );
  if (ready.rows.length === 1) return ready.rows[0].id;
  if (ready.rows.length > 1) return null;

  const any = await query(
    `SELECT id FROM rulebooks WHERE org_id = $1 ORDER BY created_at ASC LIMIT 2`,
    [orgId],
  );
  if (any.rows.length === 1) return any.rows[0].id;
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

export async function getAccessibleJobRow(user, jobId) {
  const vis = visibilityWhere(user);
  const params = [...vis.params, jobId];
  const result = await query(
    `SELECT j.* FROM jobs j WHERE ${vis.sql} AND j.id = $${params.length}`,
    params,
  );
  if (!result.rows[0]) throw new AppError('Job not found', 404, 'NOT_FOUND');
  return result.rows[0];
}

const SUMMARY_SELECT = `
  SELECT
    j.id, j.org_id, j.site, j.job_type, j.rulebook_id, j.status, j.created_at, j.closed_at,
    j.worker_id, u.name AS worker_name,
    COUNT(f.id)::int AS finding_count,
    COUNT(f.id) FILTER (WHERE f.verdict = 'pass')::int AS pass_count,
    COUNT(f.id) FILTER (WHERE f.verdict = 'review')::int AS review_count,
    COUNT(f.id) FILTER (WHERE f.verdict = 'fail')::int AS fail_count,
    rep.id AS report_id, rep.job_id AS report_job_id, rep.status AS report_status, rep.pdf_storage_key
  FROM jobs j
  JOIN users u ON u.id = j.worker_id
  LEFT JOIN findings f ON f.job_id = j.id
  LEFT JOIN reports rep ON rep.job_id = j.id
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
    where.push(
      `(j.site ILIKE $${params.length} OR COALESCE(j.job_type, '') ILIKE $${params.length} OR u.name ILIKE $${params.length})`,
    );
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
  const headlineSql = `CASE
    WHEN COUNT(f.id) FILTER (WHERE f.verdict = 'fail') > 0 THEN 'fail'
    WHEN COUNT(f.id) FILTER (WHERE f.verdict = 'review') > 0 THEN 'review'
    WHEN COUNT(f.id) FILTER (WHERE f.verdict = 'pass') > 0 THEN 'pass'
    ELSE 'open'
  END`;

  let havingSql = '';
  if (queryParams.headline) {
    params.push(queryParams.headline);
    havingSql = `HAVING ${headlineSql} = $${params.length}`;
  }

  const count = havingSql
    ? await query(
        `SELECT COUNT(*)::int AS total FROM (
           SELECT j.id
           FROM jobs j
           JOIN users u ON u.id = j.worker_id
           LEFT JOIN findings f ON f.job_id = j.id
           WHERE ${whereSql}
           GROUP BY j.id
           ${havingSql}
         ) counted`,
        params,
      )
    : await query(
        `SELECT COUNT(*)::int AS total FROM jobs j JOIN users u ON u.id = j.worker_id WHERE ${whereSql}`,
        params,
      );

  params.push(pagination.limit, pagination.offset);
  const rows = await query(
    `${SUMMARY_SELECT}
     WHERE ${whereSql}
     GROUP BY j.id, u.id, rep.id
     ${havingSql}
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

export async function getJob(user, id, baseUrl = '', { n8n } = {}) {
  let row;
  if (n8n) {
    const result = await query(`${SUMMARY_SELECT} WHERE j.id = $1 GROUP BY j.id, u.id, rep.id`, [id]);
    row = result.rows[0];
  } else {
    const vis = visibilityWhere(user);
    const params = [...vis.params, id];
    const result = await query(
      `${SUMMARY_SELECT}
       WHERE ${vis.sql} AND j.id = $${params.length}
       GROUP BY j.id, u.id, rep.id`,
      params,
    );
    row = result.rows[0];
  }
  if (!row) throw new AppError('Job not found', 404, 'NOT_FOUND');

  const findings = await query(
    `SELECT id, media_ids, transcript, attributes, verdict, severity, cited_clause, reason, created_at
     FROM findings WHERE job_id = $1 ORDER BY created_at ASC`,
    [id],
  );
  const report = await query(
    `SELECT id, job_id, status, pdf_storage_key FROM reports WHERE job_id = $1`,
    [id],
  );
  const actions = await query(
    `SELECT id, type, target, status, metadata, created_at
     FROM actions WHERE job_id = $1 ORDER BY created_at ASC`,
    [id],
  );

  const reportRow = report.rows[0];
  const findingsOut = [];
  for (const finding of findings.rows) {
    const mediaIds = finding.media_ids ?? [];
    const audio = await audioFromMediaIds(user?.org_id || row.org_id, mediaIds, baseUrl);
    findingsOut.push({
      id: finding.id,
      mediaIds,
      photoUrls: await urlsForMediaIds(user?.org_id || row.org_id, mediaIds, baseUrl),
      audioId: audio.audioId,
      audioUrl: audio.audioUrl,
      transcript: finding.transcript || '',
      attributes: finding.attributes ?? {},
      verdict: finding.verdict,
      severity: finding.severity,
      citedClause: finding.cited_clause,
      reason: finding.reason,
      createdAt: finding.created_at,
    });
  }
  return {
    ...jobSummary(row),
    findings: findingsOut,
    report: serializeReport(reportRow),
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

export async function createFinding(user, jobId, body, { idempotencyKey, method, path } = {}) {
  if (!idempotencyKey) throw new AppError('Idempotency-Key is required', 400, 'VALIDATION_ERROR');

  const replay = await findIdempotentResponse(user.id, idempotencyKey);
  if (replay) return { replay: true, status: replay.response_status, data: replay.response_body.data };

  const job = await getAccessibleJobRow(user, jobId);
  if (job.status === 'closed') throw new AppError('Job already closed', 409, 'CONFLICT');

  const photoIds = [...body.mediaIds];
  const audioId = body.audioId || null;
  const ids = audioId ? [...photoIds, audioId] : photoIds;
  const media = await query(
    `SELECT id, type, mime, storage_key FROM media WHERE org_id = $1 AND id = ANY($2::uuid[])`,
    [user.org_id, ids],
  );
  if (media.rows.length !== ids.length) {
    throw new AppError('Media not found for this org', 422, 'UNPROCESSABLE');
  }

  let transcript = String(body.transcript || '').trim();
  if (audioId && !transcript) {
    const audio = media.rows.find((row) => row.id === audioId || String(row.id) === String(audioId));
    if (audio?.type === 'audio') {
      transcript = await ai.transcribe({
        buffer: await storage.getBuffer(audio.storage_key),
        mime: audio.mime,
        filename: `voice-note.${(audio.mime || '').includes('mpeg') ? 'mp3' : 'm4a'}`,
      });
    }
  }

  const storedMediaIds = audioId && !photoIds.includes(audioId) ? [...photoIds, audioId] : photoIds;

  return withTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO findings (
         job_id, media_ids, transcript, attributes, verdict, severity, cited_clause, reason
       )
       VALUES ($1, $2::uuid[], $3, $4::jsonb, $5, $6, $7::jsonb, $8)
       RETURNING id, verdict, severity, transcript`,
      [
        jobId,
        storedMediaIds,
        transcript,
        JSON.stringify(body.attributes || {}),
        body.verdict,
        body.severity,
        JSON.stringify(body.citedClause),
        body.reason,
      ],
    );
    const row = inserted.rows[0];
    const data = {
      id: row.id,
      verdict: row.verdict,
      severity: row.severity,
      transcript: row.transcript || '',
      audioId: audioId || null,
    };
    await saveIdempotentResponse(client, {
      userId: user.id,
      key: idempotencyKey,
      method,
      path,
      status: 201,
      body: { success: true, data },
    });
    return { replay: false, status: 201, data };
  });
}

function closeSummary(job, report, counts) {
  return {
    id: job.id,
    status: job.status,
    closedAt: job.closed_at,
    report: { id: report?.id ?? null, status: report?.status ?? null },
    counts,
  };
}

export async function closeJob(user, jobId) {
  const job = await getAccessibleJobRow(user, jobId);

  const countsFor = async (clientOrNull) => {
    const q = clientOrNull ? clientOrNull.query.bind(clientOrNull) : query;
    const countsRes = await q(
      `SELECT
         COUNT(*) FILTER (WHERE verdict = 'pass')::int AS pass,
         COUNT(*) FILTER (WHERE verdict = 'review')::int AS review,
         COUNT(*) FILTER (WHERE verdict = 'fail')::int AS fail
       FROM findings WHERE job_id = $1`,
      [jobId],
    );
    return {
      pass: countsRes.rows[0].pass,
      review: countsRes.rows[0].review,
      fail: countsRes.rows[0].fail,
    };
  };

  if (job.status === 'closed') {
    const report = await query(`SELECT id, job_id, status FROM reports WHERE job_id = $1`, [jobId]);
    throw new AppError('Job already closed', 409, 'CONFLICT', closeSummary(job, report.rows[0], await countsFor()));
  }

  const closed = await withTransaction(async (client) => {
    const updated = await client.query(
      `UPDATE jobs SET status = 'closed', closed_at = now()
       WHERE id = $1 AND org_id = $2 AND status = 'open'
       RETURNING *`,
      [jobId, user.org_id],
    );
    if (!updated.rows[0]) {
      throw new AppError('Job already closed', 409, 'CONFLICT');
    }
    const closedJob = updated.rows[0];

    const report = await client.query(
      `INSERT INTO reports (job_id, status) VALUES ($1, 'pending')
       ON CONFLICT (job_id) DO UPDATE SET job_id = EXCLUDED.job_id
       RETURNING id, job_id, status, pdf_storage_key`,
      [jobId],
    );

    await client.query(
      `INSERT INTO issues (org_id, job_id, finding_id)
       SELECT $1, $2, f.id
       FROM findings f
       WHERE f.job_id = $2 AND f.verdict IN ('review', 'fail')
         AND NOT EXISTS (SELECT 1 FROM issues i WHERE i.finding_id = f.id)`,
      [user.org_id, jobId],
    );

    const counts = await countsFor(client);
    const deliveryId = newOutboxId();
    const payload = await buildJobClosedPayload(jobId, deliveryId, client);
    payload.job.closedAt = closedJob.closed_at;
    payload.occurredAt =
      closedJob.closed_at instanceof Date ? closedJob.closed_at.toISOString() : payload.occurredAt;
    await enqueue(client, {
      id: deliveryId,
      eventType: 'job.closed',
      aggregateId: jobId,
      payload,
    });

    return closeSummary(closedJob, report.rows[0], counts);
  });

  await queues.outbox.add();
  return closed;
}
