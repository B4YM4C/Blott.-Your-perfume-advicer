/**
 * SQL adapter — Postgres-first (Neon/Vercel Postgres) with optional MySQL fallback.
 * Activated when APP_MODE=production.
 *
 * Configuration (any of):
 *   DATABASE_URL=postgres://...          ← preferred (Neon, Vercel, Supabase)
 *   POSTGRES_URL=postgres://...          ← Vercel Postgres convention
 *   DB_DRIVER=postgres|mysql             ← override driver detection
 *   DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME  ← classic split config
 *
 * Schema lives in /sql/schema.postgres.sql (and /sql/schema.sql for MySQL).
 * Implements the same interface as mockDb so they're swappable in lib/db/index.js.
 */

import { nanoid } from 'nanoid';

let _client = null;
let _driver = null;

function detectDriver() {
  const explicit = (process.env.DB_DRIVER || '').toLowerCase();
  if (explicit) return explicit === 'pg' ? 'postgres' : explicit;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) return 'postgres';
  if (url.startsWith('mysql://')) return 'mysql';
  // default: prefer postgres for new deploys
  return 'postgres';
}

async function client() {
  if (_client) return _client;
  _driver = detectDriver();

  if (_driver === 'mysql') {
    const mysql = await import('mysql2/promise');
    const url = process.env.DATABASE_URL;
    _client = url
      ? await mysql.createPool(url)
      : await mysql.createPool({
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT || 3306),
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          waitForConnections: true,
          connectionLimit: 10,
        });
  } else if (_driver === 'postgres' || _driver === 'pg') {
    _driver = 'postgres';
    const { Pool } = await import('pg');
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    _client = url
      ? new Pool({ connectionString: url, ssl: needSsl(url) ? { rejectUnauthorized: false } : false, max: 10 })
      : new Pool({
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT || 5432),
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
          max: 10,
        });
  } else {
    throw new Error(`Unsupported DB_DRIVER: ${_driver}`);
  }
  return _client;
}

function needSsl(url) {
  // Neon, Supabase, Vercel Postgres all need SSL unless explicitly disabled
  if (process.env.DB_SSL === 'false') return false;
  return /sslmode=require/.test(url) || /\.neon\.tech/.test(url) || /\.vercel-storage\.com/.test(url) ||
         /\.supabase\.co/.test(url) || process.env.DB_SSL === 'true';
}

async function q(sql, params = []) {
  const c = await client();
  if (_driver === 'mysql') {
    const [rows] = await c.execute(sql, params);
    return rows;
  } else {
    // Translate ? → $1 $2 placeholders for pg
    let i = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++i}`);
    const res = await c.query(pgSql, params);
    return res.rows;
  }
}

// JSON helpers — mysql2 returns parsed JSON for JSON columns sometimes,
// pg returns parsed for jsonb. Normalise.
function asJson(v, fallback) {
  if (v == null) return fallback;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fallback; }
}
function jsonParam(v) {
  // Both drivers accept a JSON-stringified value bound to a JSON/JSONB column.
  return JSON.stringify(v ?? null);
}

function stripInternalEggFields(v) {
  const out = { ...(v || {}) };
  delete out.__type;
  return out;
}

// Postgres UPSERT vs MySQL UPSERT — keep them in one place.
function upsertSql(table, cols, conflictCol, updateCols) {
  const placeholders = cols.map(() => '?').join(',');
  if (_driver === 'mysql') {
    const updates = updateCols.map((c) => `${c}=VALUES(${c})`).join(', ');
    return `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})
            ON DUPLICATE KEY UPDATE ${updates}`;
  }
  const updates = updateCols.map((c) => `${c}=EXCLUDED.${c}`).join(', ');
  return `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})
          ON CONFLICT (${conflictCol}) DO UPDATE SET ${updates}`;
}

function nowSql() {
  return _driver === 'mysql' ? 'NOW()' : 'NOW()';
}

export const sqlDb = {
  // ---- Questions ----
  async listQuestions() {
    // Use double-quoted "order" alias for postgres; backticks aren't valid pg.
    const orderCol = _driver === 'mysql' ? '`order`' : '"order"';
    let qs;
    try {
      qs = await q(`SELECT id, sort_order AS ${orderCol}, title, subtitle, image, copy, i18n, multi_select FROM questions WHERE deleted_at IS NULL ORDER BY sort_order ASC`);
    } catch (e) {
      try {
        console.warn('[listQuestions] falling back without i18n column:', e.message);
        qs = await q(`SELECT id, sort_order AS ${orderCol}, title, subtitle, image, copy, multi_select FROM questions WHERE deleted_at IS NULL ORDER BY sort_order ASC`);
      } catch (err) {
        console.warn('[listQuestions] falling back without copy/i18n columns:', err.message);
        qs = await q(`SELECT id, sort_order AS ${orderCol}, title, subtitle, image, multi_select FROM questions WHERE deleted_at IS NULL ORDER BY sort_order ASC`);
      }
    }
    let cs;
    try {
      cs = await q('SELECT question_id, code, label, image, images, scores, i18n FROM choices ORDER BY question_id, code');
    } catch (e) {
      console.warn('[listQuestions] falling back without choice i18n column:', e.message);
      cs = await q('SELECT question_id, code, label, image, images, scores FROM choices ORDER BY question_id, code');
    }
    const byQ = new Map();
    cs.forEach((c) => {
      const arr = byQ.get(c.question_id) || [];
      arr.push({
        code: c.code,
        label: c.label,
        image: c.image,
        images: asJson(c.images, []),
        scores: asJson(c.scores, {}),
        i18n: asJson(c.i18n, {}),
      });
      byQ.set(c.question_id, arr);
    });
    return qs.map((row) => ({
      id: row.id,
      order: row.order,
      title: row.title,
      subtitle: row.subtitle,
      image: row.image,
      copy: asJson(row.copy, {}),
      i18n: asJson(row.i18n, {}),
      multiSelect: !!row.multi_select,
      choices: byQ.get(row.id) || [],
    }));
  },

  async getQuestion(id) {
    const all = await this.listQuestions();
    return all.find((x) => x.id === id) || null;
  },

  async upsertQuestion(question) {
    if (!question.id) question.id = `q${nanoid(6)}`;
    try {
      await q(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS copy ${_driver === 'mysql' ? 'JSON NOT NULL' : 'JSONB NOT NULL'} DEFAULT ${_driver === 'mysql' ? "'{}'" : "'{}'::jsonb"}`);
      await q(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS i18n ${_driver === 'mysql' ? 'JSON NOT NULL' : 'JSONB NOT NULL'} DEFAULT ${_driver === 'mysql' ? "'{}'" : "'{}'::jsonb"}`);
      await q(`ALTER TABLE choices ADD COLUMN IF NOT EXISTS i18n ${_driver === 'mysql' ? 'JSON NOT NULL' : 'JSONB NOT NULL'} DEFAULT ${_driver === 'mysql' ? "'{}'" : "'{}'::jsonb"}`);
    } catch (_) { /* older MySQL may not support IF NOT EXISTS; ignore and try insert */ }
    const sql = upsertSql(
      'questions',
      ['id', 'sort_order', 'title', 'subtitle', 'image', 'copy', 'i18n', 'multi_select'],
      'id',
      ['sort_order', 'title', 'subtitle', 'image', 'copy', 'i18n', 'multi_select'],
    );
    await q(sql, [
      question.id,
      question.order ?? 0,
      question.title || '',
      question.subtitle || null,
      question.image || null,
      jsonParam(question.copy || {}),
      jsonParam(question.i18n || {}),
      !!question.multiSelect,
    ]);
    await q('DELETE FROM choices WHERE question_id = ?', [question.id]);
    for (const ch of (question.choices || [])) {
      await q('INSERT INTO choices (question_id, code, label, image, images, scores, i18n) VALUES (?,?,?,?,?,?,?)',
        [question.id, ch.code, ch.label, ch.image || null, jsonParam(ch.images || []), jsonParam(ch.scores || {}), jsonParam(ch.i18n || {})]);
    }
    return question;
  },

  async deleteQuestion(id) {
    await q(`UPDATE questions SET deleted_at = ${nowSql()} WHERE id = ?`, [id]);
    return true;
  },

  // ---- Mappings (legacy pattern table) ----
  async listMappings() {
    const rows = await q('SELECT pattern, fragrance, house, family, notes, blurb, image FROM result_mappings ORDER BY id ASC');
    return rows.map((r) => ({ ...r, notes: asJson(r.notes, []) }));
  },
  async upsertMapping(m) {
    const sql = upsertSql(
      'result_mappings',
      ['pattern', 'fragrance', 'house', 'family', 'notes', 'blurb', 'image'],
      'pattern',
      ['fragrance', 'house', 'family', 'notes', 'blurb', 'image'],
    );
    await q(sql, [m.pattern, m.fragrance, m.house || null, m.family || null, jsonParam(m.notes || []), m.blurb || null, m.image || null]);
    return m;
  },
  async replaceMappings(list) {
    await q('DELETE FROM result_mappings');
    for (const m of list) await this.upsertMapping(m);
    return list.length;
  },

  // ---- Perfumes (vector-scoring DNA library) ----
  async listPerfumes() {
    let rows;
    try {
      rows = await q('SELECT id, fragrance, house, family, notes, blurb, image, dna, i18n FROM perfumes ORDER BY house, fragrance');
    } catch (e) {
      console.warn('[listPerfumes] falling back without i18n column:', e.message);
      rows = await q('SELECT id, fragrance, house, family, notes, blurb, image, dna FROM perfumes ORDER BY house, fragrance');
    }
    return rows.map((r) => ({
      id: r.id,
      fragrance: r.fragrance,
      house: r.house,
      family: r.family,
      notes: asJson(r.notes, []),
      blurb: r.blurb,
      image: r.image,
      dna: asJson(r.dna, {}),
      i18n: asJson(r.i18n, {}),
    }));
  },
  async getPerfume(id) {
    let rows;
    try {
      rows = await q('SELECT id, fragrance, house, family, notes, blurb, image, dna, i18n FROM perfumes WHERE id = ?', [id]);
    } catch (e) {
      console.warn('[getPerfume] falling back without i18n column:', e.message);
      rows = await q('SELECT id, fragrance, house, family, notes, blurb, image, dna FROM perfumes WHERE id = ?', [id]);
    }
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: r.id, fragrance: r.fragrance, house: r.house, family: r.family,
      notes: asJson(r.notes, []), blurb: r.blurb, image: r.image, dna: asJson(r.dna, {}),
      i18n: asJson(r.i18n, {}),
    };
  },
  async upsertPerfume(p) {
    if (!p.id) {
      const slug = (p.fragrance || 'perfume').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32);
      p.id = `p_${slug || 'item'}_${nanoid(4)}`;
    }
    try {
      await q(`ALTER TABLE perfumes ADD COLUMN IF NOT EXISTS i18n ${_driver === 'mysql' ? 'JSON NOT NULL' : 'JSONB NOT NULL'} DEFAULT ${_driver === 'mysql' ? "'{}'" : "'{}'::jsonb"}`);
    } catch (_) { /* ignore and try insert */ }
    const sql = upsertSql(
      'perfumes',
      ['id', 'fragrance', 'house', 'family', 'notes', 'blurb', 'image', 'dna', 'i18n'],
      'id',
      ['fragrance', 'house', 'family', 'notes', 'blurb', 'image', 'dna', 'i18n'],
    );
    await q(sql, [
      p.id, p.fragrance || '', p.house || null, p.family || null,
      jsonParam(p.notes || []), p.blurb || null, p.image || null, jsonParam(p.dna || {}), jsonParam(p.i18n || {}),
    ]);
    return p;
  },
  async deletePerfume(id) {
    await q('DELETE FROM perfumes WHERE id = ?', [id]);
    return true;
  },

  // ---- Params (single-row config) ----
  async getParams() {
    const rows = await q('SELECT meta_weight, clamp_min, clamp_max, core, meta FROM params WHERE id = ?', ['current']);
    if (!rows[0]) {
      // Return sensible defaults so the app doesn't 500 on a fresh DB
      return {
        metaWeight: 0.5,
        clamp: { min: -10, max: 10 },
        core: [],
        meta: [],
      };
    }
    const r = rows[0];
    return {
      metaWeight: Number(r.meta_weight ?? 0.5),
      clamp: { min: Number(r.clamp_min ?? -10), max: Number(r.clamp_max ?? 10) },
      core: asJson(r.core, []),
      meta: asJson(r.meta, []),
    };
  },
  async setParams(next) {
    if (!next || typeof next !== 'object') throw new Error('params must be an object');
    const sql = upsertSql(
      'params',
      ['id', 'meta_weight', 'clamp_min', 'clamp_max', 'core', 'meta'],
      'id',
      ['meta_weight', 'clamp_min', 'clamp_max', 'core', 'meta'],
    );
    await q(sql, [
      'current',
      typeof next.metaWeight === 'number' ? next.metaWeight : 0.5,
      next.clamp?.min ?? -10,
      next.clamp?.max ?? 10,
      jsonParam(Array.isArray(next.core) ? next.core : []),
      jsonParam(Array.isArray(next.meta) ? next.meta : []),
    ]);
    return this.getParams();
  },

  // ---- Site copy (CMS for editable static pages) ----
  // getCopy must NEVER throw — every public page calls it on every render.
  // If the migration hasn't been applied yet (table missing), fall back to {}
  // so /data/copy.json defaults take over. Same shape as fresh install.
  async getCopy() {
    try {
      const rows = await q('SELECT data FROM site_copy WHERE id = ?', ['current']);
      return asJson(rows[0]?.data, {}) || {};
    } catch (e) {
      console.warn('[sqlDb.getCopy] site_copy missing — using defaults:', e.message);
      return {};
    }
  },
  async setCopy(next) {
    if (!next || typeof next !== 'object') throw new Error('copy must be an object');
    // Lazily create the table on first save so /admin/copy works even before
    // migration is run on Neon. Idempotent — matches sql/migrations/20260428.
    try {
      await q(`CREATE TABLE IF NOT EXISTS site_copy (
        id          VARCHAR(16)  PRIMARY KEY,
        data        ${_driver === 'mysql' ? 'JSON' : 'JSONB'}        NOT NULL,
        updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
    } catch (_) { /* ignore — table likely already exists */ }
    const sql = upsertSql('site_copy', ['id', 'data'], 'id', ['data']);
    await q(sql, ['current', jsonParam(next)]);
    return next;
  },

  // ---- Easter Eggs ----
  async listEasterEggs() {
    const rows = await q('SELECT id, label, enabled, priority, constraints, result FROM easter_eggs ORDER BY priority DESC, id ASC');
    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      enabled: !!r.enabled,
      priority: Number(r.priority || 0),
      type: asJson(r.constraints, {}).__type || 'quiz',
      constraints: stripInternalEggFields(asJson(r.constraints, {})),
      result: asJson(r.result, {}),
    }));
  },
  async getEasterEgg(id) {
    const rows = await q('SELECT id, label, enabled, priority, constraints, result FROM easter_eggs WHERE id = ?', [id]);
    if (!rows[0]) return null;
    const r = rows[0];
    const constraints = asJson(r.constraints, {});
    return {
      id: r.id, label: r.label, enabled: !!r.enabled, priority: Number(r.priority || 0),
      type: constraints.__type || 'quiz',
      constraints: stripInternalEggFields(constraints), result: asJson(r.result, {}),
    };
  },
  async upsertEasterEgg(rule) {
    if (!rule.id) rule.id = `egg_${nanoid(8)}`;
    const constraints = { ...(rule.constraints || {}), __type: rule.type || rule.constraints?.__type || 'quiz' };
    const sql = upsertSql(
      'easter_eggs',
      ['id', 'label', 'enabled', 'priority', 'constraints', 'result'],
      'id',
      ['label', 'enabled', 'priority', 'constraints', 'result'],
    );
    await q(sql, [
      rule.id, rule.label || '', !!rule.enabled, rule.priority ?? 0,
      jsonParam(constraints), jsonParam(rule.result || {}),
    ]);
    return rule;
  },
  async deleteEasterEgg(id) {
    await q('DELETE FROM easter_eggs WHERE id = ?', [id]);
    return true;
  },

  // ---- Users / Sessions ----
  async createUser({ username }) {
    const id = `u_${nanoid(10)}`;
    await q(`INSERT INTO users (id, username, created_at) VALUES (?,?,${nowSql()})`, [id, username || 'Anonymous']);
    return { id, username, email: null };
  },
  async setUserEmail(userId, email) {
    await q('UPDATE users SET email = ? WHERE id = ?', [email, userId]);
    return { id: userId, email };
  },
  async createSession(userId) {
    const id = `s_${nanoid(12)}`;
    await q(`INSERT INTO sessions (id, user_id, started_at) VALUES (?,?,${nowSql()})`, [id, userId]);
    return { id, userId, startedAt: Date.now() };
  },
  async completeSession(sessionId) {
    await q(`UPDATE sessions SET completed_at = ${nowSql()} WHERE id = ?`, [sessionId]);
    return { id: sessionId, completedAt: Date.now() };
  },
  async getSession(sessionId) {
    const rows = await q('SELECT id, user_id AS "userId", started_at AS "startedAt", completed_at AS "completedAt" FROM sessions WHERE id = ?', [sessionId]);
    return rows[0] || null;
  },

  // ---- Answers ----
  async saveAnswer({ sessionId, questionId, questionOrder, choiceCode }) {
    const code = Array.isArray(choiceCode) ? choiceCode.join(',') : String(choiceCode);
    // ON CONFLICT (session_id, question_id) — upsert so a re-answer overwrites
    if (_driver === 'mysql') {
      await q(`INSERT INTO answers (session_id, question_id, question_order, choice_code, answered_at)
               VALUES (?,?,?,?,${nowSql()})
               ON DUPLICATE KEY UPDATE choice_code=VALUES(choice_code), question_order=VALUES(question_order)`,
        [sessionId, questionId, questionOrder, code]);
    } else {
      await q(`INSERT INTO answers (session_id, question_id, question_order, choice_code)
               VALUES (?,?,?,?)
               ON CONFLICT (session_id, question_id) DO UPDATE SET
                 choice_code = EXCLUDED.choice_code,
                 question_order = EXCLUDED.question_order`,
        [sessionId, questionId, questionOrder, code]);
    }
    return { sessionId, questionId, questionOrder, choiceCode };
  },
  async listAnswers(sessionId) {
    const rows = await q('SELECT question_id AS "questionId", question_order AS "questionOrder", choice_code AS "choiceCode" FROM answers WHERE session_id = ? ORDER BY question_order ASC', [sessionId]);
    // Re-split comma codes back into arrays
    return rows.map((r) => ({
      ...r,
      choiceCode: typeof r.choiceCode === 'string' && r.choiceCode.includes(',') ? r.choiceCode.split(',') : r.choiceCode,
    }));
  },

  // ---- Results ----
  async saveResult(sessionId, result) {
    // result_blob carries the full payload (vector + alternatives + reasons + reasons text)
    // for the admin detail view. Top-level columns mirror the most-queried fields.
    const distance = typeof result.distance === 'number' ? result.distance : null;
    const special = !!result.special;
    const ruleId = result.ruleId || null;
    const perfumeId = result.perfumeId || null;
    const blob = jsonParam({
      vector: result.vector || null,
      alternatives: result.alternatives || [],
      reasons: result.reasons || [],
      ruleLabel: result.ruleLabel || null,
    });

    // Try the rich INSERT (needs migration 20260424). On column-doesn't-exist
    // error we retry with the legacy 8-column shape so quiz completion still
    // succeeds on a DB where the migration hasn't been applied yet.
    const richInsertPg = `INSERT INTO results
                 (session_id, pattern, fragrance, house, family, notes, blurb, image,
                  distance, special, rule_id, perfume_id, result_blob)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT (session_id) DO UPDATE SET
                 pattern=EXCLUDED.pattern, fragrance=EXCLUDED.fragrance, house=EXCLUDED.house,
                 family=EXCLUDED.family, notes=EXCLUDED.notes, blurb=EXCLUDED.blurb, image=EXCLUDED.image,
                 distance=EXCLUDED.distance, special=EXCLUDED.special, rule_id=EXCLUDED.rule_id,
                 perfume_id=EXCLUDED.perfume_id, result_blob=EXCLUDED.result_blob`;
    const legacyInsertPg = `INSERT INTO results
                 (session_id, pattern, fragrance, house, family, notes, blurb, image)
               VALUES (?,?,?,?,?,?,?,?)
               ON CONFLICT (session_id) DO UPDATE SET
                 pattern=EXCLUDED.pattern, fragrance=EXCLUDED.fragrance, house=EXCLUDED.house,
                 family=EXCLUDED.family, notes=EXCLUDED.notes, blurb=EXCLUDED.blurb, image=EXCLUDED.image`;

    const richInsertMy = `INSERT INTO results
                 (session_id, pattern, fragrance, house, family, notes, blurb, image,
                  distance, special, rule_id, perfume_id, result_blob, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,${nowSql()})
               ON DUPLICATE KEY UPDATE pattern=VALUES(pattern), fragrance=VALUES(fragrance), house=VALUES(house),
                 family=VALUES(family), notes=VALUES(notes), blurb=VALUES(blurb), image=VALUES(image),
                 distance=VALUES(distance), special=VALUES(special), rule_id=VALUES(rule_id),
                 perfume_id=VALUES(perfume_id), result_blob=VALUES(result_blob)`;
    const legacyInsertMy = `INSERT INTO results
                 (session_id, pattern, fragrance, house, family, notes, blurb, image, created_at)
               VALUES (?,?,?,?,?,?,?,?,${nowSql()})
               ON DUPLICATE KEY UPDATE pattern=VALUES(pattern), fragrance=VALUES(fragrance), house=VALUES(house),
                 family=VALUES(family), notes=VALUES(notes), blurb=VALUES(blurb), image=VALUES(image)`;

    const richArgs = [sessionId, result.pattern || '', result.fragrance, result.house || null, result.family || null,
                      jsonParam(result.notes || []), result.blurb || null, result.image || null,
                      distance, special, ruleId, perfumeId, blob];
    const legacyArgs = [sessionId, result.pattern || '', result.fragrance, result.house || null, result.family || null,
                        jsonParam(result.notes || []), result.blurb || null, result.image || null];

    try {
      if (_driver === 'mysql') await q(richInsertMy, richArgs);
      else                     await q(richInsertPg, richArgs);
    } catch (e) {
      console.warn('[saveResult] falling back to legacy shape:', e.message);
      if (_driver === 'mysql') await q(legacyInsertMy, legacyArgs);
      else                     await q(legacyInsertPg, legacyArgs);
    }
    return { sessionId, ...result };
  },
  async getResult(sessionId) {
    let rows;
    try {
      rows = await q(
        `SELECT pattern, fragrance, house, family, notes, blurb, image,
                distance, special, rule_id AS "ruleId", perfume_id AS "perfumeId", result_blob AS "resultBlob"
         FROM results WHERE session_id = ?`,
        [sessionId],
      );
    } catch (e) {
      // Pre-migration DB: new columns don't exist yet — fall back.
      console.warn('[getResult] falling back to legacy shape:', e.message);
      rows = await q(
        `SELECT pattern, fragrance, house, family, notes, blurb, image
         FROM results WHERE session_id = ?`,
        [sessionId],
      );
    }
    if (!rows[0]) return null;
    const r = rows[0];
    const blob = asJson(r.resultBlob, {}) || {};
    return {
      pattern: r.pattern,
      fragrance: r.fragrance,
      house: r.house,
      family: r.family,
      notes: asJson(r.notes, []),
      blurb: r.blurb,
      image: r.image,
      distance: r.distance == null ? null : Number(r.distance),
      special: !!r.special,
      ruleId: r.ruleId,
      ruleLabel: blob.ruleLabel || null,
      perfumeId: r.perfumeId,
      vector: blob.vector || null,
      alternatives: blob.alternatives || [],
      reasons: blob.reasons || [],
    };
  },

  // ---- Dashboard / Sessions admin reads ---------------------------
  /**
   * Paginated list of FINISHED quizzes only — joins session + user + result
   * so the /admin/sessions page can render flat rows.
   */
  async listCompletedSessions({ limit = 50, offset = 0 } = {}) {
    // Postgres-only EXTRACT — MySQL falls back to TIMESTAMPDIFF below.
    const durExpr = _driver === 'mysql'
      ? 'TIMESTAMPDIFF(MICROSECOND, s.started_at, s.completed_at) / 1000'
      : 'EXTRACT(EPOCH FROM (s.completed_at - s.started_at)) * 1000';

    // Try the rich query (needs migration 20260424). If new columns don't
    // exist yet, fall back to a legacy shape so /admin/sessions still works.
    const richSql = `
      SELECT s.id            AS id,
             s.user_id       AS "userId",
             u.username      AS username,
             u.email         AS email,
             s.started_at    AS "startedAt",
             s.completed_at  AS "completedAt",
             ${durExpr}      AS "durationMs",
             r.pattern       AS pattern,
             r.fragrance     AS fragrance,
             r.house         AS house,
             r.family        AS family,
             r.special       AS special,
             r.rule_id       AS "ruleId",
             r.distance      AS distance
        FROM sessions s
        LEFT JOIN users u   ON u.id = s.user_id
        LEFT JOIN results r ON r.session_id = s.id
       WHERE s.completed_at IS NOT NULL
       ORDER BY s.completed_at DESC
       LIMIT ? OFFSET ?`;

    const legacySql = `
      SELECT s.id            AS id,
             s.user_id       AS "userId",
             u.username      AS username,
             u.email         AS email,
             s.started_at    AS "startedAt",
             s.completed_at  AS "completedAt",
             ${durExpr}      AS "durationMs",
             r.pattern       AS pattern,
             r.fragrance     AS fragrance,
             r.house         AS house,
             r.family        AS family
        FROM sessions s
        LEFT JOIN users u   ON u.id = s.user_id
        LEFT JOIN results r ON r.session_id = s.id
       WHERE s.completed_at IS NOT NULL
       ORDER BY s.completed_at DESC
       LIMIT ? OFFSET ?`;

    let rows;
    try {
      rows = await q(richSql, [Number(limit), Number(offset)]);
    } catch (e) {
      console.warn('[listCompletedSessions] falling back to legacy shape:', e.message);
      rows = await q(legacySql, [Number(limit), Number(offset)]);
    }
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      username: row.username || 'Anonymous',
      email: row.email || null,
      startedAt: row.startedAt ? new Date(row.startedAt).getTime() : null,
      completedAt: row.completedAt ? new Date(row.completedAt).getTime() : null,
      durationMs: row.durationMs == null ? null : Number(row.durationMs),
      pattern: row.pattern || null,
      fragrance: row.fragrance || null,
      house: row.house || null,
      family: row.family || null,
      special: !!row.special,
      ruleId: row.ruleId || null,
      distance: row.distance == null ? null : Number(row.distance),
    }));
  },

  /**
   * Full per-session detail for /admin/sessions/[id].
   * Returns { session, user, answers[], result } or null when missing.
   */
  async getSessionDetail(id) {
    const sRows = await q(
      `SELECT s.id                            AS id,
              s.user_id                       AS "userId",
              s.started_at                    AS "startedAt",
              s.completed_at                  AS "completedAt",
              s.user_agent                    AS "userAgent",
              s.referrer                      AS referrer,
              u.username                      AS username,
              u.email                         AS email
       FROM sessions s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
      [id],
    );
    if (!sRows[0]) return null;
    const s = sRows[0];

    const startedAt = s.startedAt ? new Date(s.startedAt).getTime() : null;
    const completedAt = s.completedAt ? new Date(s.completedAt).getTime() : null;

    const answers = await q(
      `SELECT question_id    AS "questionId",
              question_order AS "questionOrder",
              choice_code    AS "choiceCode",
              answered_at    AS "answeredAt"
       FROM answers
       WHERE session_id = ?
       ORDER BY question_order ASC`,
      [id],
    );
    const answersOut = answers.map((a) => ({
      ...a,
      choiceCode: typeof a.choiceCode === 'string' && a.choiceCode.includes(',')
        ? a.choiceCode.split(',') : a.choiceCode,
      answeredAt: a.answeredAt ? new Date(a.answeredAt).getTime() : null,
    }));

    const result = await this.getResult(id);

    return {
      session: {
        id: s.id,
        startedAt,
        completedAt,
        durationMs: startedAt && completedAt ? completedAt - startedAt : null,
        userAgent: s.userAgent || null,
        referrer: s.referrer || null,
      },
      user: { id: s.userId, username: s.username || 'Anonymous', email: s.email || null },
      answers: answersOut,
      result,
    };
  },

  /**
   * Aggregated dashboard stats — only counts COMPLETED quizzes.
   * Each query is wrapped in `tryQ` so a missing column / table from a
   * partially-applied migration only zeroes-out one stat, not the whole page.
   * That way `/admin` stays alive even on a fresh DB before migrations run.
   */
  async dashboardSummary() {
    const num = (v) => Number(v ?? 0);
    const dayInterval = (n) => (_driver === 'mysql' ? `INTERVAL ${n} DAY` : `INTERVAL '${n} days'`);

    const tryQ = async (sql, params, label) => {
      try { return await q(sql, params); }
      catch (e) {
        console.warn(`[dashboardSummary:${label}]`, e.message);
        return [];
      }
    };

    const [tot]     = await tryQ('SELECT COUNT(*) AS c FROM sessions WHERE completed_at IS NOT NULL', [], 'total');
    const [today]   = await tryQ(`SELECT COUNT(*) AS c FROM sessions WHERE completed_at >= NOW() - ${dayInterval(1)}`, [], 'today');
    const [week]    = await tryQ(`SELECT COUNT(*) AS c FROM sessions WHERE completed_at >= NOW() - ${dayInterval(7)}`, [], 'week');
    // `special` column added in migration 20260424 — gracefully missing on stale DBs.
    const [special] = await tryQ('SELECT COUNT(*) AS c FROM results WHERE special = TRUE', [], 'special');

    const [emailRow] = await tryQ(
      `SELECT
         COUNT(*)                   AS total,
         COUNT(NULLIF(u.email, '')) AS with_email
       FROM results r
       LEFT JOIN sessions s ON s.id = r.session_id
       LEFT JOIN users u    ON u.id = s.user_id`,
      [],
      'emailRate',
    );
    const totalRes  = num(emailRow?.total);
    const withEmail = num(emailRow?.with_email);

    // `distance` column added in migration 20260424.
    const [distRow] = await tryQ('SELECT AVG(distance) AS avg_distance FROM results WHERE distance IS NOT NULL', [], 'avgDistance');

    const topRows = await tryQ(
      `SELECT fragrance, COUNT(*) AS c
         FROM results
        WHERE fragrance IS NOT NULL AND fragrance <> ''
        GROUP BY fragrance
        ORDER BY c DESC
        LIMIT 5`,
      [],
      'topFragrances',
    );
    const topFragrances = topRows.map((row) => ({ fragrance: row.fragrance, count: num(row.c) }));

    return {
      completedTotal: num(tot?.c),
      completedToday: num(today?.c),
      completedWeek:  num(week?.c),
      specialHits:    num(special?.c),
      emailRate:      totalRes ? Math.round((withEmail / totalRes) * 100) : 0,
      avgDistance:    distRow?.avg_distance == null ? null : Number(Number(distRow.avg_distance).toFixed(2)),
      topFragrances,
    };
  },

  // ---- Tracking & consent ----
  async logEvent(sessionId, type, payload) {
    if (process.env.TRACKING_ENABLED === 'false') return null;
    await q(`INSERT INTO tracking_events (session_id, type, payload, ts) VALUES (?,?,?,${nowSql()})`,
      [sessionId, type, jsonParam(payload || {})]);
    return true;
  },
  async logConsent({ sessionId, consent }) {
    await q(`INSERT INTO consent_log (session_id, consent, ts) VALUES (?,?,${nowSql()})`, [sessionId, consent]);
    return true;
  },

  async stats() {
    const [u] = await q('SELECT COUNT(*) AS c FROM users');
    const [s] = await q('SELECT COUNT(*) AS c FROM sessions');
    const [c] = await q('SELECT COUNT(*) AS c FROM sessions WHERE completed_at IS NOT NULL');
    const [r] = await q('SELECT COUNT(*) AS c FROM results');
    const [e] = await q('SELECT COUNT(*) AS c FROM tracking_events');
    const num = (x) => Number(x?.c ?? 0);
    return { users: num(u), sessions: num(s), completed: num(c), results: num(r), events: num(e) };
  },
};
