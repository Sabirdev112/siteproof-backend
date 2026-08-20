import { AppError } from '../../lib/AppError.js';
import { query } from '../../db/query.js';
import { storage } from '../../storage/index.js';
import { ai } from '../../ai/index.js';
import { getAccessibleJobRow } from '../jobs/jobs.service.js';

async function loadMedia(orgId, id, expectedType) {
  const result = await query(`SELECT * FROM media WHERE id = $1 AND org_id = $2`, [id, orgId]);
  const row = result.rows[0];
  if (!row) throw new AppError('Media not found for this org', 422, 'UNPROCESSABLE');
  if (expectedType && row.type !== expectedType) {
    throw new AppError(`Media ${id} must be ${expectedType}`, 422, 'UNPROCESSABLE');
  }
  return row;
}

export async function extractFinding(user, body) {
  const job = await getAccessibleJobRow(user, body.jobId);

  let rulebookTitle = '';
  if (job.rulebook_id) {
    const book = await query(`SELECT title FROM rulebooks WHERE id = $1 AND org_id = $2`, [
      job.rulebook_id,
      user.org_id,
    ]);
    rulebookTitle = book.rows[0]?.title || '';
  }

  const photos = [];
  for (const id of body.mediaIds) {
    const row = await loadMedia(user.org_id, id, 'photo');
    photos.push({
      mime: row.mime,
      buffer: await storage.getBuffer(row.storage_key),
    });
  }

  let transcript = '';
  if (body.audioId) {
    const audio = await loadMedia(user.org_id, body.audioId, 'audio');
    transcript = await ai.transcribe({
      buffer: await storage.getBuffer(audio.storage_key),
      mime: audio.mime,
      filename: 'voice-note.m4a',
    });
  }

  const attributes = await ai.inspectImage({
    photos,
    transcript,
    site: job.site,
    rulebookTitle,
  });

  return { transcript, attributes };
}
