-- ==============================================================
-- Blot. — Production SQL schema (MySQL 8 / compatible)
-- For Postgres, swap AUTO_INCREMENT → SERIAL and DATETIME → TIMESTAMPTZ.
-- ==============================================================

CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(32)  NOT NULL PRIMARY KEY,
  username      VARCHAR(120) NOT NULL,
  email         VARCHAR(255) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (email)
);

CREATE TABLE IF NOT EXISTS sessions (
  id            VARCHAR(32)  NOT NULL PRIMARY KEY,
  user_id       VARCHAR(32)  NOT NULL,
  started_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at  DATETIME     NULL,
  user_agent    VARCHAR(512) NULL,
  referrer      VARCHAR(512) NULL,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_completed (completed_at)
);

CREATE TABLE IF NOT EXISTS questions (
  id            VARCHAR(32)  NOT NULL PRIMARY KEY,
  sort_order    INT          NOT NULL,
  title         VARCHAR(255) NOT NULL,
  subtitle      VARCHAR(255) NULL,
  image         VARCHAR(512) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME     NULL,
  INDEX idx_questions_sort (sort_order)
);

CREATE TABLE IF NOT EXISTS choices (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  question_id   VARCHAR(32)  NOT NULL,
  code          VARCHAR(2)   NOT NULL,    -- 'A' | 'B' | 'C' | 'D' | ...
  label         VARCHAR(255) NOT NULL,
  image         VARCHAR(512) NULL,
  CONSTRAINT fk_choices_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_question_code (question_id, code)
);

-- One row per question answered.
-- Storing one-row-per-question (instead of one wide row) lets admin add/remove
-- questions without schema migrations. The full pattern (e.g. 1A2B3C4D5A) is
-- materialised on demand or stored on the result row.
CREATE TABLE IF NOT EXISTS answers (
  id              BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id      VARCHAR(32)  NOT NULL,
  question_id     VARCHAR(32)  NOT NULL,
  question_order  INT          NOT NULL,
  choice_code     VARCHAR(2)   NOT NULL,
  answered_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_answers_session  FOREIGN KEY (session_id)  REFERENCES sessions(id)  ON DELETE CASCADE,
  CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  INDEX idx_answers_session (session_id),
  UNIQUE KEY uniq_session_question (session_id, question_id)
);

-- Pattern → fragrance mapping. Patterns may use '*' wildcard, e.g. "1A*3*4D5A".
-- A row with pattern='default' is the catch-all.
CREATE TABLE IF NOT EXISTS result_mappings (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pattern       VARCHAR(64)  NOT NULL,
  fragrance     VARCHAR(255) NOT NULL,
  house         VARCHAR(120) NULL,
  family        VARCHAR(120) NULL,
  notes         JSON         NULL,
  blurb         TEXT         NULL,
  image         VARCHAR(512) NULL,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_pattern (pattern)
);

-- One row per completed quiz.
CREATE TABLE IF NOT EXISTS results (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id    VARCHAR(32)  NOT NULL,
  pattern       VARCHAR(64)  NOT NULL,    -- the user's actual concat e.g. 1A2B3C4D5A
  fragrance     VARCHAR(255) NOT NULL,
  house         VARCHAR(120) NULL,
  family        VARCHAR(120) NULL,
  notes         JSON         NULL,
  blurb         TEXT         NULL,
  image         VARCHAR(512) NULL,
  email_sent    TINYINT(1)   NOT NULL DEFAULT 0,
  email_skipped TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_results_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_results_session (session_id),
  INDEX idx_results_pattern (pattern)
);

-- Tracking — only logged when user has consented (PDPA).
-- Type examples: 'page_view', 'quiz_start', 'question_answered', 'quiz_complete',
--                'email_submitted', 'email_skipped', 'consent_change', 'referrer'
CREATE TABLE IF NOT EXISTS tracking_events (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id    VARCHAR(32)  NULL,
  type          VARCHAR(64)  NOT NULL,
  payload       JSON         NULL,
  ts            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_events_session (session_id),
  INDEX idx_events_type (type),
  INDEX idx_events_ts (ts)
);

-- Audit trail for PDPA consent decisions.
CREATE TABLE IF NOT EXISTS consent_log (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id    VARCHAR(32)  NULL,
  consent       VARCHAR(16)  NOT NULL,    -- 'accepted' | 'rejected' | 'withdrawn'
  ts            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_consent_session (session_id)
);
