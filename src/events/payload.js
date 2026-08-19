import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { query } from '../db/query.js';
import { urlsForMediaIds } from '../modules/media/media.service.js';
import { headlineFromCounts } from '../lib/serialize.js';

function publicBase() {
  return (env.PUBLIC_API_URL || `http://localhost:${env.PORT}`).replace(/\/$/, '');
}

export async function buildJobClosedPayload(jobId, deliveryId, client) {
  const run = client ? (text, params) => client.query(text, params) : (text, params) => query(text, params);
  const baseUrl = publicBase();
  const jobRes = await run(
    `SELECT j.*, u.name AS worker_name, u.email AS worker_email
     FROM jobs j
     JOIN users u ON u.id = j.worker_id
     WHERE j.id = $1`,
    [jobId],
  );
  const job = jobRes.rows[0];
  const orgRes = await run(`SELECT * FROM organizations WHERE id = $1`, [job.org_id]);
  const org = orgRes.rows[0];
  const findings = await run(
    `SELECT id, media_ids, transcript, attributes, verdict, severity, cited_clause, reason
     FROM findings WHERE job_id = $1 ORDER BY created_at ASC`,
    [jobId],
  );
  const report = await run(`SELECT id, status FROM reports WHERE job_id = $1`, [jobId]);
  const counts = { pass: 0, review: 0, fail: 0 };
  const findingsOut = [];
  for (const finding of findings.rows) {
    if (counts[finding.verdict] != null) counts[finding.verdict] += 1;
    findingsOut.push({
      id: finding.id,
      transcript: finding.transcript,
      attributes: finding.attributes ?? {},
      verdict: finding.verdict,
      severity: finding.severity,
      citedClause: finding.cited_clause,
      reason: finding.reason,
      photoUrls: await urlsForMediaIds(job.org_id, finding.media_ids ?? [], baseUrl),
    });
  }

  return {
    event: 'job.closed',
    deliveryId,
    occurredAt: job.closed_at?.toISOString?.() || new Date().toISOString(),
    org: {
      id: org.id,
      name: org.name,
      branding: org.branding ?? {},
      settings: org.settings ?? {},
    },
    job: {
      id: job.id,
      site: job.site,
      jobType: job.job_type,
      status: job.status,
      closedAt: job.closed_at,
      rulebookId: job.rulebook_id,
      worker: { id: job.worker_id, name: job.worker_name, email: job.worker_email },
      counts,
      headline: headlineFromCounts(counts),
      findings: findingsOut,
      report: report.rows[0] ? { id: report.rows[0].id, status: report.rows[0].status } : null,
    },
  };
}

export function newOutboxId() {
  return randomUUID();
}
