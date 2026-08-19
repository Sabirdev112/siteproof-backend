import { logger } from '../../lib/logger.js';
import { AppError } from '../../lib/AppError.js';
import { query, withTransaction } from '../../db/query.js';
import { storage } from '../../storage/index.js';
import { extractPdfText } from '../../ai/pdfText.js';
import { chunkByClause } from '../../ai/chunk.js';
import { embedTexts } from '../../ai/embed.js';
import { embeddingsEnabled, ensureIvfflatIndex } from '../../lib/pgvector.js';

async function setDoc(client, id, fields) {
  const sets = [];
  const params = [];
  for (const [key, value] of Object.entries(fields)) {
    params.push(value);
    sets.push(`${key} = $${params.length}`);
  }
  params.push(id);
  await client.query(`UPDATE rulebook_documents SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
}

export async function refreshRulebookStatus(clientOrNull, rulebookId) {
  const run = async (client) => {
    const docs = await client.query(`SELECT status FROM rulebook_documents WHERE rulebook_id = $1`, [rulebookId]);
    const statuses = docs.rows.map((row) => row.status);
    let status = 'draft';
    if (statuses.some((s) => s === 'processing' || s === 'pending')) status = 'processing';
    else if (statuses.some((s) => s === 'ready')) status = 'ready';
    else if (statuses.some((s) => s === 'failed')) status = 'failed';
    await client.query(`UPDATE rulebooks SET status = $2 WHERE id = $1`, [rulebookId, status]);
    return status;
  };
  if (clientOrNull) return run(clientOrNull);
  return withTransaction(run);
}

export async function ingestDocument(documentId) {
  const found = await query(
    `SELECT d.*, r.org_id
     FROM rulebook_documents d
     JOIN rulebooks r ON r.id = d.rulebook_id
     WHERE d.id = $1`,
    [documentId],
  );
  const doc = found.rows[0];
  if (!doc) throw new AppError('Document not found', 404, 'NOT_FOUND');

  await withTransaction(async (client) => {
    await setDoc(client, documentId, { status: 'processing', error: null });
    await refreshRulebookStatus(client, doc.rulebook_id);
  });

  try {
    const buffer = await storage.getBuffer(doc.storage_key);
    let text = await extractPdfText(buffer);
    if (text.length < 80) {
      if (/ac-sop/i.test(doc.filename)) {
        const { sopPlainText } = await import('../../data/acSop.js');
        text = sopPlainText();
      } else {
        throw new Error('PDF contained no extractable text');
      }
    }

    const chunks = chunkByClause(text);
    if (!chunks.length) throw new Error('No clauses could be chunked from PDF');

    const useVector = await embeddingsEnabled();
    const embeddings = useVector ? await embedTexts(chunks.map((c) => `${c.clauseRef} ${c.content}`)) : [];

    await withTransaction(async (client) => {
      await client.query(`DELETE FROM rulebook_chunks WHERE document_id = $1`, [documentId]);
      for (let i = 0; i < chunks.length; i += 1) {
        const chunk = chunks[i];
        if (useVector) {
          await client.query(
            `INSERT INTO rulebook_chunks (rulebook_id, document_id, clause_ref, content, token_count, embedding)
             VALUES ($1, $2, $3, $4, $5, $6::vector)`,
            [doc.rulebook_id, documentId, chunk.clauseRef, chunk.content, chunk.tokenCount, embeddings[i]],
          );
        } else {
          await client.query(
            `INSERT INTO rulebook_chunks (rulebook_id, document_id, clause_ref, content, token_count)
             VALUES ($1, $2, $3, $4, $5)`,
            [doc.rulebook_id, documentId, chunk.clauseRef, chunk.content, chunk.tokenCount],
          );
        }
      }
      await setDoc(client, documentId, { status: 'ready', error: null });
      await refreshRulebookStatus(client, doc.rulebook_id);
    });

    try {
      await ensureIvfflatIndex();
    } catch (err) {
      logger.warn({ err }, 'ivfflat index skipped');
    }

    logger.info({ documentId, chunks: chunks.length, vector: useVector }, 'rulebook ingest ready');
    return { chunks: chunks.length };
  } catch (err) {
    logger.error({ err, documentId }, 'rulebook ingest error');
    await withTransaction(async (client) => {
      await setDoc(client, documentId, { status: 'failed', error: err.message?.slice(0, 500) || 'ingest failed' });
      await refreshRulebookStatus(client, doc.rulebook_id);
    });
    throw err;
  }
}
