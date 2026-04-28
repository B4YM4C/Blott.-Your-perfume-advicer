/**
 * In-memory mock DB for local development & testing.
 * - Loads seed data from /data/*.json on first read
 * - Stores everything in module-level Maps
 * - State resets when the Node process restarts (perfect for ephemeral tests)
 */

import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';

const DATA_DIR = path.join(process.cwd(), 'data');

let _seeded = false;
const store = {
  questions: new Map(),       // id -> question
  mappings: [],               // [ {pattern, fragrance, ...} ]  (legacy)
  perfumes: [],               // [ { id, fragrance, dna: {...}, ... } ]
  params: null,               // { core: [], meta: [], metaWeight, clamp }
  easterEggs: [],             // [ { id, label, enabled, priority, constraints, result } ]
  copy: {},                   // editable site copy override on top of /data/copy.json
  users: new Map(),           // id -> user (anon username + optional email)
  sessions: new Map(),        // sessionId -> { userId, startedAt, completedAt }
  answers: [],                // { sessionId, questionId, choiceCode, answeredAt }
  results: new Map(),         // sessionId -> { fragrance, pattern, ... }
  trackingEvents: [],         // { sessionId, type, payload, ts }
  consentLog: [],             // { sessionId, consent, ts, ip? }
};

const DEFAULT_PARAMS = {
  metaWeight: 0.5,
  clamp: { min: -10, max: 10 },
  core: [
    { name: 'Masculine', label: 'Masculine', description: '' },
    { name: 'Maturity',  label: 'Maturity',  description: '' },
    { name: 'Freshness', label: 'Freshness', description: '' },
    { name: 'Sweetness', label: 'Sweetness', description: '' },
    { name: 'Intensity', label: 'Intensity', description: '' },
    { name: 'Formality', label: 'Formality', description: '' },
    { name: 'Time',      label: 'Time',      description: '' },
  ],
  meta: [
    { name: 'Modern',  label: 'Modern',  description: '' },
    { name: 'Sexy',    label: 'Sexy',    description: '' },
    { name: 'Luxury',  label: 'Luxury',  description: '' },
    { name: 'Playful', label: 'Playful', description: '' },
  ],
};

function seed() {
  if (_seeded) return;
  try {
    const q = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'questions.json'), 'utf-8'));
    q.questions.forEach((it) => store.questions.set(it.id, it));
  } catch (e) {
    console.warn('[mockDb] questions seed failed:', e.message);
  }
  try {
    const m = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'mappings.json'), 'utf-8'));
    store.mappings = m.mappings || [];
  } catch (e) {
    // mappings.json is legacy and optional in the new vector-scoring system
    store.mappings = [];
  }
  try {
    const p = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'perfumes.json'), 'utf-8'));
    store.perfumes = p.perfumes || [];
  } catch (e) {
    console.warn('[mockDb] perfumes seed failed:', e.message);
    store.perfumes = [];
  }
  try {
    const j = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'params.json'), 'utf-8'));
    store.params = {
      metaWeight: typeof j.metaWeight === 'number' ? j.metaWeight : 0.5,
      clamp: j.clamp || { min: -10, max: 10 },
      core: Array.isArray(j.core) ? j.core : DEFAULT_PARAMS.core,
      meta: Array.isArray(j.meta) ? j.meta : DEFAULT_PARAMS.meta,
    };
  } catch (e) {
    console.warn('[mockDb] params seed failed, using defaults:', e.message);
    store.params = JSON.parse(JSON.stringify(DEFAULT_PARAMS));
  }
  try {
    const j = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'easterEggs.json'), 'utf-8'));
    store.easterEggs = j.rules || [];
  } catch (e) {
    store.easterEggs = [];
  }
  _seeded = true;
}

// ---- Questions ----
export const mockDb = {
  async listQuestions() {
    seed();
    return [...store.questions.values()].sort((a, b) => a.order - b.order);
  },
  async getQuestion(id) { seed(); return store.questions.get(id) || null; },
  async upsertQuestion(q) {
    seed();
    if (!q.id) q.id = `q${nanoid(6)}`;
    store.questions.set(q.id, q);
    return q;
  },
  async deleteQuestion(id) { seed(); return store.questions.delete(id); },

  // ---- Mappings (legacy pattern table) ----
  async listMappings() { seed(); return store.mappings; },
  async upsertMapping(m, index) {
    seed();
    if (typeof index === 'number' && index >= 0) store.mappings[index] = m;
    else store.mappings.push(m);
    return m;
  },
  async deleteMapping(index) { seed(); store.mappings.splice(index, 1); return true; },

  // ---- Perfumes (vector-scoring DNA library) ----
  async listPerfumes() { seed(); return store.perfumes; },
  async getPerfume(id) { seed(); return store.perfumes.find((p) => p.id === id) || null; },
  async upsertPerfume(p, index) {
    seed();
    if (typeof index === 'number' && index >= 0) store.perfumes[index] = p;
    else {
      const i = store.perfumes.findIndex((x) => x.id === p.id);
      if (i >= 0) store.perfumes[i] = p;
      else store.perfumes.push(p);
    }
    return p;
  },
  async deletePerfume(id) {
    seed();
    const i = store.perfumes.findIndex((p) => p.id === id);
    if (i < 0) return false;
    store.perfumes.splice(i, 1);
    return true;
  },

  // ---- Users (anonymous, no signup) ----
  async createUser({ username }) {
    const u = { id: `u_${nanoid(10)}`, username: username || 'Anonymous', email: null, createdAt: Date.now() };
    store.users.set(u.id, u);
    return u;
  },
  async setUserEmail(userId, email) {
    const u = store.users.get(userId); if (!u) return null;
    u.email = email; return u;
  },

  // ---- Sessions ----
  async createSession(userId) {
    const id = `s_${nanoid(12)}`;
    const sess = { id, userId, startedAt: Date.now(), completedAt: null };
    store.sessions.set(id, sess); return sess;
  },
  async completeSession(sessionId) {
    const s = store.sessions.get(sessionId); if (!s) return null;
    s.completedAt = Date.now(); return s;
  },
  async getSession(sessionId) { return store.sessions.get(sessionId) || null; },

  // ---- Answers ----
  async saveAnswer({ sessionId, questionId, questionOrder, choiceCode }) {
    const row = { sessionId, questionId, questionOrder, choiceCode, answeredAt: Date.now() };
    store.answers.push(row);
    return row;
  },
  async listAnswers(sessionId) {
    return store.answers.filter((a) => a.sessionId === sessionId).sort((a, b) => a.questionOrder - b.questionOrder);
  },

  // ---- Results ----
  async saveResult(sessionId, result) {
    const rec = { sessionId, ...result, createdAt: Date.now() };
    store.results.set(sessionId, rec); return rec;
  },
  async getResult(sessionId) { return store.results.get(sessionId) || null; },

  // ---- Tracking ----
  async logEvent(sessionId, type, payload) {
    if (process.env.TRACKING_ENABLED === 'false') return null;
    const evt = { sessionId, type, payload, ts: Date.now() };
    store.trackingEvents.push(evt); return evt;
  },
  async listEvents(sessionId) {
    return store.trackingEvents.filter((e) => e.sessionId === sessionId);
  },

  // ---- Consent ----
  async logConsent({ sessionId, consent }) {
    const rec = { sessionId, consent, ts: Date.now() };
    store.consentLog.push(rec); return rec;
  },

  // ---- Params (configurable scoring axes) ----
  async getParams() { seed(); return store.params; },
  async setParams(next) {
    seed();
    if (!next || typeof next !== 'object') throw new Error('params must be an object');
    store.params = {
      metaWeight: typeof next.metaWeight === 'number' ? next.metaWeight : (store.params?.metaWeight ?? 0.5),
      clamp: next.clamp || store.params?.clamp || { min: -10, max: 10 },
      core: Array.isArray(next.core) ? next.core : store.params?.core || [],
      meta: Array.isArray(next.meta) ? next.meta : store.params?.meta || [],
    };
    return store.params;
  },

  // ---- Easter eggs (rule-based short-circuits) ----
  async listEasterEggs() { seed(); return [...store.easterEggs].sort((a, b) => (b.priority || 0) - (a.priority || 0)); },
  async getEasterEgg(id) { seed(); return store.easterEggs.find((r) => r.id === id) || null; },
  async upsertEasterEgg(rule) {
    seed();
    if (!rule.id) rule.id = `egg_${nanoid(8)}`;
    const i = store.easterEggs.findIndex((r) => r.id === rule.id);
    if (i >= 0) store.easterEggs[i] = rule; else store.easterEggs.push(rule);
    return rule;
  },
  async deleteEasterEgg(id) {
    seed();
    const i = store.easterEggs.findIndex((r) => r.id === id);
    if (i < 0) return false;
    store.easterEggs.splice(i, 1);
    return true;
  },

  // ---- Admin reads ----
  async stats() {
    return {
      users: store.users.size,
      sessions: store.sessions.size,
      completed: [...store.sessions.values()].filter((s) => s.completedAt).length,
      results: store.results.size,
      events: store.trackingEvents.length,
    };
  },

  /**
   * Paginated list of FINISHED quizzes only — joins session + user + result
   * into one flat row that the admin /sessions page can render directly.
   */
  async listCompletedSessions({ limit = 50, offset = 0 } = {}) {
    const rows = [...store.sessions.values()]
      .filter((s) => s.completedAt)
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
      .slice(offset, offset + limit);
    return rows.map((s) => {
      const u = store.users.get(s.userId) || {};
      const r = store.results.get(s.id) || {};
      return {
        id: s.id,
        userId: s.userId,
        username: u.username || 'Anonymous',
        email: u.email || null,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        durationMs: s.completedAt ? s.completedAt - s.startedAt : null,
        pattern: r.pattern || null,
        fragrance: r.fragrance || null,
        house: r.house || null,
        family: r.family || null,
        special: !!r.special,
        ruleId: r.ruleId || null,
        distance: typeof r.distance === 'number' ? r.distance : null,
      };
    });
  },

  /**
   * Full per-session detail for /admin/sessions/[id].
   * Returns { session, user, answers[], result } or null if the session
   * doesn't exist / wasn't completed.
   */
  async getSessionDetail(id) {
    const s = store.sessions.get(id);
    if (!s) return null;
    const u = store.users.get(s.userId) || {};
    const r = store.results.get(id) || null;
    const answers = store.answers
      .filter((a) => a.sessionId === id)
      .sort((a, b) => a.questionOrder - b.questionOrder);
    return {
      session: {
        id: s.id,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        durationMs: s.completedAt ? s.completedAt - s.startedAt : null,
      },
      user: { id: u.id || s.userId, username: u.username || 'Anonymous', email: u.email || null },
      answers,
      result: r,
    };
  },

  /**
   * Aggregated dashboard stats — only counts COMPLETED quizzes.
   */
  async dashboardSummary() {
    const completed = [...store.sessions.values()].filter((s) => s.completedAt);
    const now = Date.now();
    const ONE_DAY = 86_400_000;
    const inLast = (n) => completed.filter((s) => now - s.completedAt < n * ONE_DAY).length;

    const results = [...store.results.values()];
    const fragCount = new Map();
    let specialHits = 0;
    let withEmail = 0;
    let totalDistance = 0;
    let withDistance = 0;

    for (const r of results) {
      fragCount.set(r.fragrance, (fragCount.get(r.fragrance) || 0) + 1);
      if (r.special) specialHits++;
      if (typeof r.distance === 'number') { totalDistance += r.distance; withDistance++; }
      const sess = store.sessions.get(r.sessionId);
      const u = sess ? store.users.get(sess.userId) : null;
      if (u && u.email) withEmail++;
    }

    const topFragrances = [...fragCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([fragrance, count]) => ({ fragrance, count }));

    return {
      completedTotal: completed.length,
      completedToday: inLast(1),
      completedWeek: inLast(7),
      specialHits,
      emailRate: results.length ? Math.round((withEmail / results.length) * 100) : 0,
      avgDistance: withDistance ? Number((totalDistance / withDistance).toFixed(2)) : null,
      topFragrances,
    };
  },

  // ---- Site copy (CMS for editable static pages) ----
  /**
   * Returns the override JSON only (DB row), not merged with defaults.
   * Public reads should call lib/copy.js → mergeWithDefaults() to layer
   * /data/copy.json beneath this.
   */
  async getCopy() {
    return store.copy || {};
  },
  /**
   * Replace the entire override blob. The editor sends the full merged
   * object so save semantics stay simple.
   */
  async setCopy(next) {
    if (!next || typeof next !== 'object') throw new Error('copy must be an object');
    store.copy = next;
    return store.copy;
  },
};
