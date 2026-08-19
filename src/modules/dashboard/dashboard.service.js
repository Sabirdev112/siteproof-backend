import { query } from '../../db/query.js';
import { headlineFromCounts } from '../../lib/serialize.js';

const RECENT_LIMIT = 20;

export async function getSummary(user) {
  const today = await query(
    `WITH closed_today AS (
       SELECT
         j.id,
         COUNT(f.id) FILTER (WHERE f.verdict = 'pass')::int AS pass,
         COUNT(f.id) FILTER (WHERE f.verdict = 'review')::int AS review,
         COUNT(f.id) FILTER (WHERE f.verdict = 'fail')::int AS fail
       FROM jobs j
       LEFT JOIN findings f ON f.job_id = j.id
       WHERE j.org_id = $1
         AND j.status = 'closed'
         AND j.closed_at >= date_trunc('day', timezone('utc', now()))
         AND j.closed_at < date_trunc('day', timezone('utc', now())) + interval '1 day'
       GROUP BY j.id
     )
     SELECT
       COUNT(*)::int AS today,
       COUNT(*) FILTER (WHERE fail > 0)::int AS failed,
       COUNT(*) FILTER (WHERE fail = 0 AND review > 0)::int AS review,
       COUNT(*) FILTER (WHERE fail = 0 AND review = 0 AND pass > 0)::int AS passed
     FROM closed_today`,
    [user.org_id],
  );

  const recent = await query(
    `SELECT
       j.id, j.site, j.status, j.created_at, u.name AS worker_name,
       COUNT(f.id) FILTER (WHERE f.verdict = 'pass')::int AS pass,
       COUNT(f.id) FILTER (WHERE f.verdict = 'review')::int AS review,
       COUNT(f.id) FILTER (WHERE f.verdict = 'fail')::int AS fail
     FROM jobs j
     JOIN users u ON u.id = j.worker_id
     LEFT JOIN findings f ON f.job_id = j.id
     WHERE j.org_id = $1
     GROUP BY j.id, u.id
     ORDER BY j.created_at DESC
     LIMIT $2`,
    [user.org_id, RECENT_LIMIT],
  );

  const row = today.rows[0];
  return {
    today: row.today,
    passed: row.passed,
    review: row.review,
    failed: row.failed,
    recentJobs: recent.rows.map((job) => {
      const counts = { pass: job.pass, review: job.review, fail: job.fail };
      return {
        id: job.id,
        site: job.site,
        workerName: job.worker_name,
        status: job.status,
        headline: headlineFromCounts(counts),
        counts,
        createdAt: job.created_at,
      };
    }),
  };
}
