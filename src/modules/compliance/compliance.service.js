import { AppError } from '../../lib/AppError.js';
import { query } from '../../db/query.js';
import { ai } from '../../ai/index.js';
import { getAccessibleJobRow } from '../jobs/jobs.service.js';
import { retrieveChunks } from '../rulebooks/rulebooks.service.js';

function findingQuery({ transcript, attributes }) {
  return [transcript, attributes?.object, attributes?.condition, attributes?.location, attributes?.apparentIssue]
    .filter(Boolean)
    .join(' ')
    .trim();
}

export async function checkCompliance(user, body) {
  const job = await getAccessibleJobRow(user, body.jobId);
  const rulebookId = body.rulebookId || job.rulebook_id;
  if (!rulebookId) throw new AppError('No rulebook on this job', 422, 'UNPROCESSABLE');

  const book = await query(`SELECT id, status FROM rulebooks WHERE id = $1 AND org_id = $2`, [
    rulebookId,
    user.org_id,
  ]);
  if (!book.rows[0]) throw new AppError('Rulebook not found', 404, 'NOT_FOUND');

  const q = findingQuery(body);
  if (!q) throw new AppError('Finding text is required', 400, 'VALIDATION_ERROR');

  let clauses = await retrieveChunks(rulebookId, q, 6);
  if (!clauses.length && body.attributes?.apparentIssue) {
    clauses = await retrieveChunks(rulebookId, body.attributes.apparentIssue, 6);
  }
  if (!clauses.length) {
    clauses = await retrieveChunks(rulebookId, body.attributes?.object || 'install', 6);
  }
  if (!clauses.length) {
    throw new AppError('No rulebook clauses to check against', 422, 'UNPROCESSABLE');
  }

  return ai.verdict({
    transcript: body.transcript || '',
    attributes: body.attributes || {},
    clauses,
  });
}
