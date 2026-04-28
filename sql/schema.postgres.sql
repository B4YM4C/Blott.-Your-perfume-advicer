-- ==============================================================
-- Blot. — Production schema (Postgres / Neon)
-- Apply once after creating an empty database:
--    psql "$DATABASE_URL" -f sql/schema.postgres.sql
--
-- Then run scripts/seed-postgres.mjs to load the JSON seeds.
-- ==============================================================

-- Drop in dependency order if you want a clean re-apply (commented out by
-- default — uncomment carefully on real data).
-- DROP TABLE IF EXISTS consent_log, tracking_events, results, answers,
--   choices, questions, easter_eggs, perfumes, params, result_mappings,
--   sessions, users CASCADE;

-- ---------- Users / Sessions ----------------------------------

CREATE TABLE IF NOT EXISTS users (
  id          VARCHAR(32)  PRIMARY KEY,
  username    VARCHAR(120) NOT NULL,
  email       VARCHAR(255),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS sessions (
  id            VARCHAR(32)  PRIMARY KEY,
  user_id       VARCHAR(32)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  user_agent    VARCHAR(512),
  referrer      VARCHAR(512)
);
CREATE INDEX IF NOT EXISTS idx_sessions_user      ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_completed ON sessions(completed_at);

-- ---------- Quiz: Questions + Choices -------------------------

CREATE TABLE IF NOT EXISTS questions (
  id            VARCHAR(32)  PRIMARY KEY,
  sort_order    INT          NOT NULL,
  title         VARCHAR(255) NOT NULL,
  subtitle      VARCHAR(255),
  image         VARCHAR(512),
  multi_select  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_questions_sort ON questions(sort_order);

CREATE TABLE IF NOT EXISTS choices (
  id           BIGSERIAL    PRIMARY KEY,
  question_id  VARCHAR(32)  NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  code         VARCHAR(4)   NOT NULL,
  label        VARCHAR(255) NOT NULL,
  image        VARCHAR(512),
  scores       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (question_id, code)
);

-- ---------- Answers / Results --------------------------------

CREATE TABLE IF NOT EXISTS answers (
  id              BIGSERIAL    PRIMARY KEY,
  session_id      VARCHAR(32)  NOT NULL REFERENCES sessions(id)  ON DELETE CASCADE,
  question_id     VARCHAR(32)  NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_order  INT          NOT NULL,
  -- Store as text so multi-select can serialise as comma-joined codes,
  -- e.g. "A,C". Quiz logic re-splits as needed.
  choice_code     VARCHAR(64)  NOT NULL,
  answered_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_answers_session ON answers(session_id);

-- Legacy pattern → fragrance mapping (still used by admin UI).
CREATE TABLE IF NOT EXISTS result_mappings (
  id          BIGSERIAL    PRIMARY KEY,
  pattern     VARCHAR(64)  NOT NULL UNIQUE,
  fragrance   VARCHAR(255) NOT NULL,
  house       VARCHAR(120),
  family      VARCHAR(120),
  notes       JSONB,
  blurb       TEXT,
  image       VARCHAR(512),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS results (
  id            BIGSERIAL    PRIMARY KEY,
  session_id    VARCHAR(32)  NOT NULL REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  pattern       VARCHAR(64)  NOT NULL,
  fragrance     VARCHAR(255) NOT NULL,
  house         VARCHAR(120),
  family        VARCHAR(120),
  notes         JSONB,
  blurb         TEXT,
  image         VARCHAR(512),
  distance      REAL,
  special       BOOLEAN      NOT NULL DEFAULT FALSE,
  rule_id       VARCHAR(64),
  perfume_id    VARCHAR(64),
  -- Full result payload (vector + alternatives + reasons) for admin detail view.
  result_blob   JSONB,
  email_sent    BOOLEAN      NOT NULL DEFAULT FALSE,
  email_skipped BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_results_pattern   ON results(pattern);
CREATE INDEX IF NOT EXISTS idx_results_fragrance ON results(fragrance);
CREATE INDEX IF NOT EXISTS idx_results_created   ON results(created_at DESC);

-- ---------- Vector-scoring DNA library ------------------------

CREATE TABLE IF NOT EXISTS perfumes (
  id          VARCHAR(64)  PRIMARY KEY,
  fragrance   VARCHAR(255) NOT NULL,
  house       VARCHAR(120),
  family      VARCHAR(120),
  notes       JSONB        NOT NULL DEFAULT '[]'::jsonb,
  blurb       TEXT,
  image       VARCHAR(512),
  dna         JSONB        NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_perfumes_house  ON perfumes(house);
CREATE INDEX IF NOT EXISTS idx_perfumes_family ON perfumes(family);

-- Single-row scoring config. Always read/written with id='current'.
CREATE TABLE IF NOT EXISTS params (
  id           VARCHAR(16)  PRIMARY KEY,        -- always 'current'
  meta_weight  REAL         NOT NULL DEFAULT 0.5,
  clamp_min    INT          NOT NULL DEFAULT -10,
  clamp_max    INT          NOT NULL DEFAULT 10,
  core         JSONB        NOT NULL DEFAULT '[]'::jsonb,
  meta         JSONB        NOT NULL DEFAULT '[]'::jsonb,
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS easter_eggs (
  id           VARCHAR(64)  PRIMARY KEY,
  label        VARCHAR(255) NOT NULL,
  enabled      BOOLEAN      NOT NULL DEFAULT TRUE,
  priority     INT          NOT NULL DEFAULT 0,
  constraints  JSONB        NOT NULL DEFAULT '{}'::jsonb,
  result       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eggs_priority ON easter_eggs(priority DESC);

-- Editable static page copy. Single-row store, id='current'. Reads merge
-- with /data/copy.json defaults so missing keys never blank the public site.
CREATE TABLE IF NOT EXISTS site_copy (
  id          VARCHAR(16)  PRIMARY KEY,        -- always 'current'
  data        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------- Tracking + consent (PDPA) -------------------------

CREATE TABLE IF NOT EXISTS tracking_events (
  id          BIGSERIAL    PRIMARY KEY,
  session_id  VARCHAR(32),
  type        VARCHAR(64)  NOT NULL,
  payload     JSONB,
  ts          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_session ON tracking_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type    ON tracking_events(type);
CREATE INDEX IF NOT EXISTS idx_events_ts      ON tracking_events(ts);

CREATE TABLE IF NOT EXISTS consent_log (
  id          BIGSERIAL    PRIMARY KEY,
  session_id  VARCHAR(32),
  consent     VARCHAR(16)  NOT NULL,
  ts          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consent_session ON consent_log(session_id);
