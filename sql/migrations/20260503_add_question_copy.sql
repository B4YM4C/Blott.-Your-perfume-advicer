-- Per-question UI copy for dynamic quiz page editing.
-- Safe to run multiple times.

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS copy JSONB NOT NULL DEFAULT '{}'::jsonb;
