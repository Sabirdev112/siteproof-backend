-- Requires pgvector. Skip locally with SKIP_PGVECTOR=true until Phase 4.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE rulebook_chunks
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Build this index after there are chunks (Phase 4), e.g.:
-- CREATE INDEX idx_rulebook_chunks_embedding
--   ON rulebook_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
