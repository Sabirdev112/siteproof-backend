import { AppError } from '../../lib/AppError.js';
import { query } from '../../db/query.js';
import { ai } from '../../ai/index.js';
import { filterRelevantClauses } from '../../ai/verdict.js';
import { getAccessibleJobRow } from '../jobs/jobs.service.js';
import { retrieveChunks } from '../rulebooks/rulebooks.service.js';

const SOP_MISS = 'The image data does not match any SOP in this rulebook';

function findingQuery({ transcript, attributes }) {
  return [transcript, attributes?.object, attributes?.condition, attributes?.location, attributes?.apparentIssue]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function findingBlob(body) {
  return findingQuery(body);
}

export async function checkCompliance(user, body) {
  const job = await getAccessibleJobRow(user, body.jobId);
  const rulebookId = body.rulebookId || job.rulebook_id;
  if (!rulebookId) throw new AppError('No rulebook on this job', 422, 'UNPROCESSABLE');

  const book = await query(`SELECT id, status, title FROM rulebooks WHERE id = $1 AND org_id = $2`, [
    rulebookId,
    user.org_id,
  ]);
  if (!book.rows[0]) throw new AppError('Rulebook not found', 404, 'NOT_FOUND');

  const q = findingQuery(body);
  if (!q) throw new AppError('Finding text is required', 400, 'VALIDATION_ERROR');

  let clauses = await retrieveChunks(rulebookId, q, 8);
  if (!clauses.length && body.attributes?.apparentIssue) {
    clauses = await retrieveChunks(rulebookId, body.attributes.apparentIssue, 8);
  }
  if (!clauses.length && body.attributes?.object) {
    clauses = await retrieveChunks(rulebookId, body.attributes.object, 8);
  }

  // Do not fall back to a generic "install" query — that pulled unrelated SOP intro clauses.
  if (!clauses.length) {
    throw new AppError(SOP_MISS, 422, 'SOP_NOT_MATCHED');
  }

  const relevant = filterRelevantClauses(findingBlob(body), clauses);
  if (!relevant.length) {
    throw new AppError(SOP_MISS, 422, 'SOP_NOT_MATCHED');
  }

  return ai.verdict({
    transcript: body.transcript || '',
    attributes: body.attributes || {},
    clauses: relevant,
  });
}
