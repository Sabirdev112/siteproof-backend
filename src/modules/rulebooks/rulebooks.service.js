import { logger } from '../../lib/logger.js';
import { randomUUID } from 'node:crypto';
import { AppError } from '../../lib/AppError.js';
import { query, withTransaction } from '../../db/query.js';
import { storage } from '../../storage/index.js';
import { PDF_MIMES, PDF_MAX_BYTES } from '../../lib/mediaTypes.js';
import { queues } from '../../queues/index.js';
import { ai } from '../../ai/index.js';
import { embeddingsEnabled } from '../../lib/pgvector.js';
import { WIRING_CLAUSE_RE, WIRING_RE, wiringSearchBoost } from '../../lib/wiring.js';
import { refreshRulebookStatus } from './rulebooks.ingest.js';

function serializeRulebook(row) {
  return {
    id: row.id,
    title: row.title,
    vertical: row.vertical,
    status: row.status,
    createdAt: row.created_at,
    ...(row.document_count != null ? { documentCount: Number(row.document_count) } : {}),
    ...(row.chunk_count != null ? { chunkCount: Number(row.chunk_count) } : {}),
  };
}

function serializeDocument(row) {
  return {
    id: row.id,
    filename: row.filename,
    status: row.status,
    error: row.error,
  };
}

async function getOwned(orgId, id) {
  const result = await query(`SELECT * FROM rulebooks WHERE id = $1 AND org_id = $2`, [id, orgId]);
  if (!result.rows[0]) throw new AppError('Rulebook not found', 404, 'NOT_FOUND');
  return result.rows[0];
}

export async function listRulebooks(user) {
  const result = await query(
    `SELECT r.*, COUNT(d.id)::int AS document_count
     FROM rulebooks r
     LEFT JOIN rulebook_documents d ON d.rulebook_id = r.id
     WHERE r.org_id = $1
     GROUP BY r.id
     ORDER BY r.created_at ASC`,
    [user.org_id],
  );
  const docs = await query(
    `SELECT d.id, d.rulebook_id, d.filename, d.status, d.error
     FROM rulebook_documents d
     JOIN rulebooks r ON r.id = d.rulebook_id
     WHERE r.org_id = $1
     ORDER BY d.created_at ASC`,
    [user.org_id],
  );
  const byBook = new Map();
  for (const row of docs.rows) {
    const list = byBook.get(row.rulebook_id) || [];
    list.push(serializeDocument(row));
    byBook.set(row.rulebook_id, list);
  }
  return {
    items: result.rows.map((row) => ({
      ...serializeRulebook(row),
      documents: byBook.get(row.id) || [],
    })),
  };
}

function normalizeTitle(title) {
  return String(title || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 200);
}

async function findDuplicateRulebook(orgId, title) {
  const normalized = normalizeTitle(title);
  if (!normalized) return null;
  const byTitle = await query(
    `SELECT id, title FROM rulebooks
     WHERE org_id = $1 AND lower(trim(title)) = lower($2)
     ORDER BY created_at ASC
     LIMIT 1`,
    [orgId, normalized],
  );
  if (byTitle.rows[0]) return byTitle.rows[0];

  const byFile = await query(
    `SELECT r.id, r.title
     FROM rulebook_documents d
     JOIN rulebooks r ON r.id = d.rulebook_id
     WHERE r.org_id = $1
       AND (
         lower(d.filename) = lower($2)
         OR lower(regexp_replace(d.filename, '\\.pdf$', '', 'i')) = lower($2)
       )
     ORDER BY d.created_at ASC
     LIMIT 1`,
    [orgId, normalized],
  );
  return byFile.rows[0] || null;
}

export async function createRulebook(user, body) {
  const title = normalizeTitle(body.title);
  if (!title) throw new AppError('Title is required', 400, 'VALIDATION_ERROR');

  const existing = await findDuplicateRulebook(user.org_id, title);
  if (existing) {
    throw new AppError('Rulebook already exists', 409, 'CONFLICT', {
      existingId: existing.id,
      existingTitle: existing.title,
    });
  }

  const result = await query(
    `INSERT INTO rulebooks (org_id, title, vertical, status)
     VALUES ($1, $2, $3, 'draft')
     RETURNING *`,
    [user.org_id, title, body.vertical ?? null],
  );
  return serializeRulebook(result.rows[0]);
}

export async function getRulebook(user, id) {
  const row = await getOwned(user.org_id, id);
  const docs = await query(
    `SELECT * FROM rulebook_documents WHERE rulebook_id = $1 ORDER BY created_at ASC`,
    [id],
  );
  const chunks = await query(`SELECT COUNT(*)::int AS n FROM rulebook_chunks WHERE rulebook_id = $1`, [id]);
  return {
    ...serializeRulebook({ ...row, chunk_count: chunks.rows[0].n }),
    documents: docs.rows.map(serializeDocument),
  };
}

export async function getStatus(user, id) {
  const row = await getOwned(user.org_id, id);
  const docs = await query(
    `SELECT id, filename, status, error FROM rulebook_documents WHERE rulebook_id = $1 ORDER BY created_at ASC`,
    [id],
  );
  return { id: row.id, status: row.status, documents: docs.rows.map(serializeDocument) };
}

export async function addDocument(user, rulebookId, file) {
  await getOwned(user.org_id, rulebookId);
  if (!file?.buffer) throw new AppError('file is required', 400, 'VALIDATION_ERROR');
  if (!PDF_MIMES.has(file.mimetype) && !file.originalname?.toLowerCase().endsWith('.pdf')) {
    throw new AppError('Only PDF files are accepted', 415, 'UNSUPPORTED_MEDIA');
  }
  if (file.size > PDF_MAX_BYTES) throw new AppError('File too large', 413, 'PAYLOAD_TOO_LARGE');

  const filename = file.originalname || 'rulebook.pdf';
  const stem = filename.replace(/\.pdf$/i, '').trim();
  const dup = await findDuplicateRulebook(user.org_id, stem || filename);
  if (dup && dup.id !== rulebookId) {
    throw new AppError('Rulebook already exists', 409, 'CONFLICT', {
      existingId: dup.id,
      existingTitle: dup.title,
    });
  }
  const sameFile = await query(
    `SELECT d.id FROM rulebook_documents d
     JOIN rulebooks r ON r.id = d.rulebook_id
     WHERE r.org_id = $1 AND lower(d.filename) = lower($2)
     LIMIT 1`,
    [user.org_id, filename],
  );
  if (sameFile.rows[0]) {
    throw new AppError('Rulebook already exists', 409, 'CONFLICT', {
      existingId: rulebookId,
      existingTitle: filename,
    });
  }

  const id = randomUUID();
  const key = `${user.org_id}/rulebooks/${rulebookId}/${id}.pdf`;
  const stored = await storage.put({ key, body: file.buffer, contentType: 'application/pdf' });

  const doc = await withTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO rulebook_documents (id, rulebook_id, filename, storage_key, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [id, rulebookId, filename, stored.key],
    );
    await client.query(`UPDATE rulebooks SET status = 'processing' WHERE id = $1`, [rulebookId]);
    return inserted.rows[0];
  });

  await queues.ingestion.add({ documentId: doc.id });
  return { id: doc.id, filename: doc.filename, status: 'processing', error: null, rulebookId };
}

export async function deleteDocument(user, rulebookId, documentId) {
  await getOwned(user.org_id, rulebookId);
  const found = await query(
    `SELECT * FROM rulebook_documents WHERE id = $1 AND rulebook_id = $2`,
    [documentId, rulebookId],
  );
  const doc = found.rows[0];
  if (!doc) throw new AppError('Document not found', 404, 'NOT_FOUND');

  await query(`DELETE FROM rulebook_documents WHERE id = $1`, [documentId]);

  if (doc.storage_key && typeof storage.remove === 'function') {
    try {
      await storage.remove(doc.storage_key);
    } catch (err) {
      logger.warn({ err, key: doc.storage_key }, 'rulebook document storage remove failed');
    }
  }

  const left = await query(`SELECT COUNT(*)::int AS n FROM rulebook_documents WHERE rulebook_id = $1`, [rulebookId]);
  if (!left.rows[0].n) {
    await query(`UPDATE jobs SET rulebook_id = NULL WHERE rulebook_id = $1`, [rulebookId]);
    await query(`DELETE FROM rulebooks WHERE id = $1`, [rulebookId]);
    return { id: documentId, deleted: true, rulebookDeleted: true };
  }

  await refreshRulebookStatus(null, rulebookId);
  return { id: documentId, deleted: true, rulebookDeleted: false };
}

function mapChunkRows(rows, scoreKey = 'rank') {
  return rows.map((row) => ({
    id: row.id,
    clauseRef: row.clause_ref,
    content: row.content,
    score: Number(
      Math.min(1, scoreKey === 'score' ? Number(row.score) : Number(row.rank) * 4 || 0.5).toFixed(2),
    ),
  }));
}

function preferWiring(q, items) {
  if (!WIRING_RE.test(q)) return items;
  return [...items].sort((a, b) => {
    const aw = WIRING_CLAUSE_RE.test(`${a.clauseRef || ''} ${a.content || ''}`) ? 0 : 1;
    const bw = WIRING_CLAUSE_RE.test(`${b.clauseRef || ''} ${b.content || ''}`) ? 0 : 1;
    return aw - bw;
  });
}

async function lexicalChunks(rulebookId, q, cap) {
  const like = `%${q}%`;
  try {
    const result = await query(
      `SELECT id, clause_ref, content,
              ts_rank(
                to_tsvector('english', coalesce(clause_ref, '') || ' ' || content),
                websearch_to_tsquery('english', $2)
              ) AS rank
       FROM rulebook_chunks
       WHERE rulebook_id = $1
         AND (
           to_tsvector('english', coalesce(clause_ref, '') || ' ' || content) @@ websearch_to_tsquery('english', $2)
           OR content ILIKE $3
           OR coalesce(clause_ref, '') ILIKE $3
         )
       ORDER BY rank DESC, created_at ASC
       LIMIT $4`,
      [rulebookId, q, like, cap],
    );
    if (result.rows.length) return mapChunkRows(result.rows);
  } catch {
    /* websearch syntax; fall through to ILIKE */
  }

  const result = await query(
    `SELECT id, clause_ref, content, 0.5::float AS rank
     FROM rulebook_chunks
     WHERE rulebook_id = $1 AND (content ILIKE $2 OR coalesce(clause_ref, '') ILIKE $2)
     ORDER BY created_at ASC
     LIMIT $3`,
    [rulebookId, like, cap],
  );
  return mapChunkRows(result.rows);
}

export async function retrieveChunks(rulebookId, q, limit = 8) {
  const cap = Math.min(20, Math.max(1, Number(limit) || 8));
  const original = String(q || '').trim();
  if (!original) return [];

  if (await embeddingsEnabled()) {
    const vec = await ai.embedQuery(wiringSearchBoost(original));
    const result = await query(
      `SELECT id, clause_ref, content,
              GREATEST(0, LEAST(1, 1 - (embedding <=> $1::vector))) AS score
       FROM rulebook_chunks
       WHERE rulebook_id = $2 AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [vec, rulebookId, cap],
    );
    if (result.rows.length) return preferWiring(original, mapChunkRows(result.rows, 'score'));
  }

  let items = await lexicalChunks(rulebookId, original, cap);
  if (!items.length && WIRING_RE.test(original)) {
    const result = await query(
      `SELECT id, clause_ref, content, 0.8::float AS rank
       FROM rulebook_chunks
       WHERE rulebook_id = $1
         AND (
           content ILIKE '%conductor%'
           OR content ILIKE '%wiring%'
           OR content ILIKE '%insulation%'
           OR coalesce(clause_ref, '') ILIKE '%3.3%'
           OR coalesce(clause_ref, '') ILIKE '%3.7%'
         )
       ORDER BY created_at ASC
       LIMIT $2`,
      [rulebookId, cap],
    );
    items = mapChunkRows(result.rows);
  }
  return preferWiring(original, items);
}

export async function searchChunks(user, rulebookId, q, limit = 8) {
  await getOwned(user.org_id, rulebookId);
  return { items: await retrieveChunks(rulebookId, q, limit) };
}

/** Used by seed: create or reuse titled rulebook and ingest a PDF buffer. */
export async function seedRulebookFromPdf({ orgId, title, vertical, filename, buffer, replace = false }) {
  const existing = await query(
    `SELECT id, status FROM rulebooks WHERE org_id = $1 AND title = $2 ORDER BY created_at ASC LIMIT 1`,
    [orgId, title],
  );
  let rulebookId = existing.rows[0]?.id;
  if (!rulebookId) {
    const created = await query(
      `INSERT INTO rulebooks (org_id, title, vertical, status) VALUES ($1, $2, $3, 'draft') RETURNING id`,
      [orgId, title, vertical],
    );
    rulebookId = created.rows[0].id;
  } else if (replace) {
    await query(`DELETE FROM rulebook_documents WHERE rulebook_id = $1`, [rulebookId]);
  }

  const id = randomUUID();
  const key = `${orgId}/rulebooks/${rulebookId}/${id}.pdf`;
  const stored = await storage.put({ key, body: buffer, contentType: 'application/pdf' });
  await query(
    `INSERT INTO rulebook_documents (id, rulebook_id, filename, storage_key, status)
     VALUES ($1, $2, $3, $4, 'pending')`,
    [id, rulebookId, filename, stored.key],
  );
  const { ingestDocument } = await import('./rulebooks.ingest.js');
  await ingestDocument(id);
  return getRulebook({ org_id: orgId }, rulebookId);
}
