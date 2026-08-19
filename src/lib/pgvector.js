import { query } from '../db/query.js';

let cached;

export async function embeddingsEnabled() {
  if (cached !== undefined) return cached;
  const result = await query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_name = 'rulebook_chunks' AND column_name = 'embedding'`,
  );
  cached = result.rowCount > 0;
  return cached;
}

export async function ensureIvfflatIndex() {
  if (!(await embeddingsEnabled())) return false;
  const count = await query(`SELECT COUNT(*)::int AS n FROM rulebook_chunks WHERE embedding IS NOT NULL`);
  if (count.rows[0].n < 20) return false;
  await query(`
    CREATE INDEX IF NOT EXISTS idx_rulebook_chunks_embedding
    ON rulebook_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10)
  `);
  return true;
}
