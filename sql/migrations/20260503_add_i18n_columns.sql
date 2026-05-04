-- Cached translation payloads for bilingual public pages.
-- Public requests read these JSONB fields directly; translation generation
-- should happen from admin workflows, not during user-facing page loads.

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS i18n JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE choices
  ADD COLUMN IF NOT EXISTS i18n JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE perfumes
  ADD COLUMN IF NOT EXISTS i18n JSONB NOT NULL DEFAULT '{}'::jsonb;
