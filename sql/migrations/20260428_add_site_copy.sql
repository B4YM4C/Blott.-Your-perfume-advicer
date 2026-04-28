-- =============================================================
-- 2026-04-28 — site_copy table for editable static page text
-- Apply on existing Neon DB:
--    psql "$DATABASE_URL" -f sql/migrations/20260428_add_site_copy.sql
-- New deploys pick this up via schema.postgres.sql automatically.
-- Idempotent — safe to run multiple times.
-- =============================================================

CREATE TABLE IF NOT EXISTS site_copy (
  id          VARCHAR(16)  PRIMARY KEY,        -- always 'current'
  data        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
