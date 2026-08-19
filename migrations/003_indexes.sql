-- Phase 9: indexes from list/dashboard/close traces.
CREATE INDEX IF NOT EXISTS idx_jobs_org_created ON jobs (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_org_closed ON jobs (org_id, closed_at DESC)
  WHERE closed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_org_worker_created ON jobs (org_id, worker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_org ON media (org_id);
CREATE INDEX IF NOT EXISTS idx_issues_finding ON issues (finding_id);
CREATE INDEX IF NOT EXISTS idx_findings_job_verdict ON findings (job_id, verdict);
CREATE INDEX IF NOT EXISTS idx_rulebook_chunks_book_created ON rulebook_chunks (rulebook_id, created_at);
CREATE INDEX IF NOT EXISTS idx_event_outbox_aggregate ON event_outbox (aggregate_id, created_at DESC);
