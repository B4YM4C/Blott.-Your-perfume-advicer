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
    const qs = await q(`SELECT id, sort_order AS ${orderCol}, title, subtitle, image, multi_select FROM questions WHERE deleted_at IS NULL ORDER BY sort_order ASC`);
    const cs = await q('SELECT question_id, code, label, image, scores FROM choices ORDER BY question_id, code');
    const byQ = new Map();
    cs.forEach((c) => {
      const arr = byQ.get(c.question_id) || [];
      arr.push({
        code: c.code,
        label: c.label,
        image: c.image,
        scores: asJson(c.scores, {}),
      });
      byQ.set(c.question_id, arr);
    });
    return qs.map((row) => ({
      id: row.id,
      order: row.order,
      title: row.title,
      subtitle: row.subtitle,
      image: row.image,
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
    const sql = upsertSql(
      'questions',
      ['id', 'sort_order', 'title', 'subtitle', 'image', 'multi_select'],
      'id',
      ['sort_order', 'title', 'subtitle', 'image', 'multi_select'],
    );
    await q(sql, [
      question.id,
      question.order ?? 0,
      question.title || '',
      question.subtitle || null,
      question.image || null,
      !!question.multiSelect,
    ]);
    await q('DELETE FROM choices WHERE question_id = ?', [question.id]);
    for (const ch of (question.choices || [])) {
      await q('INSERT INTO choices (question_id, code, label, image, scores) VALUES (?,?,?,?,?)',
        [question.id, ch.code, ch.label, ch.image || null, jsonParam(ch.scores || {})]);
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
    const rows = await q('SELECT id, fragrance, house, family, notes, blurb, image, dna FROM perfumes ORDER BY house, fragrance');
    return rows.map((r) => ({
      id: r.id,
      fragrance: r.fragrance,
      house: r.house,
      family: r.family,
      notes: asJson(r.notes, []),
      blurb: r.blurb,
      image: r.image,
      dna: asJson(r.dna, {}),
    }));
  },
  async getPerfume(id) {
    const rows = await q('SELECT id, fragrance, house, family, notes, blurb, image, dna FROM perfumes WHERE id = ?', [id]);
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: r.id, fragrance: r.fragrance, house: r.house, family: r.family,
      notes: asJson(r.notes, []), blurb: r.blurb, image: r.image, dna: asJson(r.dna, {}),
    };
  },
  async upsertPerfume(p) {
    if (!p.id) {
      const slug = (p.fragrance || 'perfume').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32);
      p.id = `p_${slug || 'item'}_${nanoid(4)}`;
    }
    const sql = upsertSql(
      'perfumes',
      ['id', 'fragrance', 'house', 'family', 'notes', 'blurb', 'image', 'dna'],
      'id',
      ['fragrance', 'house', 'family', 'notes', 'blurb', 'image', 'dna'],
    );
    await q(sql, [
      p.id, p.fragrance || '', p.house || null, p.family || null,
      jsonParam(p.notes || []), p.blurb || null, p.image || null, jsonParam(p.dna || {}),
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

  // ---- Easter Eggs ----
  async listEasterEggs() {
    const rows = await q('SELECT id, label, enabled, priority, constraints, result FROM easter_eggs ORDER BY priority DESC, id ASC');
    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      enabled: !!r.enabled,
      priority: Number(r.priority || 0),
      constraints: asJson(r.constraints, {}),
      result: asJson(r.result, {}),
    }));
  },
  async getEasterEgg(id) {
    const rows = await q('SELECT id, label, enabled, priority, constraints, result FROM easter_eggs WHERE id = ?', [id]);
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: r.id, label: r.label, enabled: !!r.enabled, priority: Number(r.priority || 0),
      constraints: asJson(r.constraints, {}), result: asJson(r.result, {}),
    };
  },
  async upsertEasterEgg(rule) {
    if (!rule.id) rule.id = `egg_${nanoid(8)}`;
    const sql = upsertSql(
      'easter_eggs',
      ['id', 'label', 'enabled', 'priority', 'constraints', 'result'],
      'id',
      ['label', 'enabled', 'priority', 'constraints', 'result'],
    );
    await q(sql, [
      rule.id, rule.label || '', !!rule.enabled, rule.priority ?? 0,
      jsonParam(rule.constraints || {}), jsonParam(rule.result || {}),
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
    if (_driver === 'mysql') {
      await q(`INSERT INTO results (session_id, pattern, fragrance, house, family, notes, blurb, image, created_at)
               VALUES (?,?,?,?,?,?,?,?,${nowSql()})
               ON DUPLICATE KEY UPDATE pattern=VALUES(pattern), fragrance=VALUES(fragrance), house=VALUES(house),
                 family=VALUES(family), notes=VALUES(notes), blurb=VALUES(blurb), image=VALUES(image)`,
        [sessionId, result.pattern || '', result.fragrance, result.house || null, result.family || null,
         jsonParam(result.notes || []), result.blurb || null, result.image || null]);
    } else {
      await q(`INSERT INTO results (session_id, pattern, fragrance, house, family, notes, blurb, image)
               VALUES (?,?,?,?,?,?,?,?)
               ON CONFLICT (session_id) DO UPDATE SET
                 pattern=EXCLUDED.pattern, fragrance=EXCLUDED.fragrance, house=EXCLUDED.house,
                 family=EXCLUDED.family, notes=EXCLUDED.notes, blurb=EXCLUDED.blurb, image=EXCLUDED.image`,
        [sessionId, result.pattern || '', result.fragrance, result.house || null, result.family || null,
         jsonParam(result.notes || []), result.blurb || null, result.image || null]);
    }
    return { sessionId, ...result };
  },
  async getResult(sessionId) {
    const rows = await q('SELECT pattern, fragrance, house, family, notes, blurb, image FROM results WHERE session_id = ?', [sessionId]);
    if (!rows[0]) return null;
    const r = rows[0];
    return { ...r, notes: asJson(r.notes, []) };
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
