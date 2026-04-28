-- =============================================================
-- 2026-04-24 — store full result payload for the admin detail page
-- Apply on existing Neon DB:
--    psql "$DATABASE_URL" -f sql/migrations/20260424_add_result_blob.sql
-- New deploys pick this up via schema.postgres.sql automatically.
-- Idempotent — safe to run multiple times.
-- =============================================================

ALTER TABLE results
  ADD COLUMN IF NOT EXISTS distance     REAL,
  ADD COLUMN IF NOT EXISTS special      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rule_id      VARCHAR(64),
  ADD COLUMN IF NOT EXISTS perfume_id   VARCHAR(64),
  ADD COLUMN IF NOT EXISTS result_blob  JSONB;

CREATE INDEX IF NOT EXISTS idx_results_fragrance ON results(fragrance);
CREATE INDEX IF NOT EXISTS idx_results_created   ON results(created_at DESC);
