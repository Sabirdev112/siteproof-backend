import { createHmac, randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/AppError.js';
import { sha256, safeEqual } from '../../lib/crypto.js';
import { query, withTransaction } from '../../db/query.js';
import { findIdempotentResponse, saveIdempotentResponse } from '../../lib/idempotency.js';
import { storage } from '../../storage/index.js';
import {
  assertAllowedMime,
  extensionFor,
  maxBytesFor,
} from '../../lib/mediaTypes.js';

function signFile(mediaId, exp) {
  return createHmac('sha256', env.JWT_ACCESS_SECRET).update(`${mediaId}.${exp}`).digest('hex');
}

export function requestBaseUrl(req) {
  if (env.PUBLIC_API_URL) return env.PUBLIC_API_URL.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

export async function signedUrlFor(row, baseUrl) {
  if (env.STORAGE_DRIVER === 'cloudinary') {
    return storage.getSignedUrl(row.storage_key, { expiresIn: env.MEDIA_SIGN_TTL_SECONDS });
  }
  const exp = Math.floor(Date.now() / 1000) + env.MEDIA_SIGN_TTL_SECONDS;
  const sig = signFile(row.id, exp);
  return `${baseUrl}/api/v1/media/${row.id}/file?exp=${exp}&sig=${sig}`;
}

export function serializeMedia(row, url) {
  return {
    id: row.id,
    type: row.type,
    mime: row.mime,
    byteSize: row.byte_size,
    jobId: row.job_id,
    url,
  };
}

export async function urlsForMediaIds(orgId, mediaIds, baseUrl) {
  if (!mediaIds?.length) return [];
  const result = await query(
    `SELECT * FROM media WHERE org_id = $1 AND id = ANY($2::uuid[]) AND type = 'photo'`,
    [orgId, mediaIds],
  );
  const byId = new Map(result.rows.map((row) => [String(row.id), row]));
  const urls = [];
  for (const id of mediaIds) {
    const row = byId.get(String(id));
    if (!row) continue;
    urls.push(await signedUrlFor(row, baseUrl));
  }
  return urls;
}

export async function audioFromMediaIds(orgId, mediaIds, baseUrl) {
  if (!mediaIds?.length) return { audioId: null, audioUrl: null };
  const result = await query(
    `SELECT * FROM media WHERE org_id = $1 AND id = ANY($2::uuid[]) AND type = 'audio'
     ORDER BY created_at ASC LIMIT 1`,
    [orgId, mediaIds],
  );
  const row = result.rows[0];
  if (!row) return { audioId: null, audioUrl: null };
  return { audioId: row.id, audioUrl: await signedUrlFor(row, baseUrl) };
}

export async function createMedia(user, { file, type, jobId }, { idempotencyKey, method, path, baseUrl }) {
  if (idempotencyKey) {
    const replay = await findIdempotentResponse(user.id, idempotencyKey);
    if (replay) return { replay: true, status: replay.response_status, data: replay.response_body.data };
  }

  if (!file?.buffer) throw new AppError('file is required', 400, 'VALIDATION_ERROR');
  if (type !== 'photo' && type !== 'audio') {
    throw new AppError('type must be photo or audio', 400, 'VALIDATION_ERROR');
  }
  if (!assertAllowedMime(type, file.mimetype)) {
    throw new AppError(`Unsupported file type ${file.mimetype}`, 415, 'UNSUPPORTED_MEDIA');
  }
  if (file.size > maxBytesFor(type)) {
    throw new AppError('File too large', 413, 'PAYLOAD_TOO_LARGE');
  }

  if (jobId) {
    const job = await query(`SELECT id FROM jobs WHERE id = $1 AND org_id = $2`, [jobId, user.org_id]);
    if (!job.rows[0]) throw new AppError('Job not found', 404, 'NOT_FOUND');
  }

  const checksum = sha256(file.buffer);
  const existing = await query(
    `SELECT * FROM media WHERE org_id = $1 AND uploaded_by = $2 AND checksum = $3 AND type = $4 LIMIT 1`,
    [user.org_id, user.id, checksum, type],
  );
  if (existing.rows[0]) {
    const data = serializeMedia(existing.rows[0], await signedUrlFor(existing.rows[0], baseUrl));
    if (idempotencyKey) {
      await withTransaction(async (client) => {
        await saveIdempotentResponse(client, {
          userId: user.id,
          key: idempotencyKey,
          method,
          path,
          status: 201,
          body: { success: true, data },
        });
      });
    }
    return { replay: true, status: 201, data };
  }

  const id = randomUUID();
  const ext = extensionFor(file.mimetype);
  const objectKey =
    env.STORAGE_DRIVER === 'local' ? `${user.org_id}/${id}.${ext}` : `${user.org_id}/${id}`;
  const stored = await storage.put({
    key: objectKey,
    body: file.buffer,
    contentType: file.mimetype,
    type,
  });

  return withTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO media (id, org_id, job_id, uploaded_by, type, storage_key, mime, byte_size, checksum)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        user.org_id,
        jobId || null,
        user.id,
        type,
        stored.key,
        file.mimetype,
        file.size,
        checksum,
      ],
    );
    const row = inserted.rows[0];
    const data = serializeMedia(row, await signedUrlFor(row, baseUrl));
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

export async function getMedia(user, id, baseUrl) {
  const result = await query(`SELECT * FROM media WHERE id = $1 AND org_id = $2`, [id, user.org_id]);
  if (!result.rows[0]) throw new AppError('Media not found', 404, 'NOT_FOUND');
  const row = result.rows[0];
  return serializeMedia(row, await signedUrlFor(row, baseUrl));
}

export async function streamLocalFile(id, exp, sig) {
  const now = Math.floor(Date.now() / 1000);
  if (!exp || !sig || Number(exp) < now) {
    throw new AppError('Signed URL expired', 401, 'UNAUTHORIZED');
  }
  const expected = signFile(id, Number(exp));
  if (!safeEqual(sig, expected)) throw new AppError('Invalid signature', 401, 'UNAUTHORIZED');

  const result = await query(`SELECT * FROM media WHERE id = $1`, [id]);
  if (!result.rows[0]) throw new AppError('Media not found', 404, 'NOT_FOUND');
  if (env.STORAGE_DRIVER !== 'local') {
    const url = await signedUrlFor(result.rows[0], '');
    return { redirect: url };
  }
  const buffer = await storage.getBuffer(result.rows[0].storage_key);
  return { buffer, mime: result.rows[0].mime };
}
