/**
 * Vector-scoring quiz logic.
 *
 * The set of scoring axes (CORE + META) is configurable in
 * data/params.json and editable from /admin/params. The functions here
 * accept a `params` object so callers can pass in whatever the admin
 * has configured. If no `params` is passed, the legacy hard-coded
 * defaults are used as a safety net.
 *
 * answer.choiceCode may be:
 *   - a single letter ("A")        — single-select question
 *   - an array of letters (["A","C"]) — multi-select question
 */

/* ---------- Defaults & helpers ---------- */

export const DEFAULT_CORE = ['Masculine', 'Maturity', 'Freshness', 'Sweetness', 'Intensity', 'Formality', 'Time'];
export const DEFAULT_META = ['Modern', 'Sexy', 'Luxury', 'Playful'];

/** Q5 may have up to 10 choices today — keep a generous alphabet. */
export const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];

export const DEFAULT_META_WEIGHT = 0.5;
export const DEFAULT_CLAMP = { min: -10, max: 10 };

function paramNames(list) {
  if (!Array.isArray(list)) return [];
  return list.map((p) => (typeof p === 'string' ? p : p.name)).filter(Boolean);
}

export function resolveParams(params) {
  if (!params) {
    return {
      core: DEFAULT_CORE,
      meta: DEFAULT_META,
      metaWeight: DEFAULT_META_WEIGHT,
      clamp: DEFAULT_CLAMP,
    };
  }
  return {
    core: paramNames(params.core).length ? paramNames(params.core) : DEFAULT_CORE,
    meta: paramNames(params.meta).length ? paramNames(params.meta) : DEFAULT_META,
    metaWeight: typeof params.metaWeight === 'number' ? params.metaWeight : DEFAULT_META_WEIGHT,
    clamp: params.clamp || DEFAULT_CLAMP,
  };
}

const clampWith = (clamp) => (n) => Math.max(clamp.min, Math.min(clamp.max, n));

export function emptyVector(params) {
  const { core, meta } = resolveParams(params);
  const v = {};
  for (const p of [...core, ...meta]) v[p] = 0;
  return v;
}

/* ---------- Pattern (analytics) ---------- */

/** Coerce a choiceCode (string or array) to a stable string for the pattern. */
function codeToString(c) {
  if (Array.isArray(c)) return c.join('');
  return String(c || '');
}

export function buildPattern(answers) {
  return [...answers]
    .sort((a, b) => a.questionOrder - b.questionOrder)
    .map((a) => `${a.questionOrder}${codeToString(a.choiceCode)}`)
    .join('');
}

export function parsePattern(str) {
  const out = [];
  // Allow runs of letters per question (multi-select), e.g. "1B2AC3D"
  const re = /(\d+)([A-Z]+)/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    out.push({ order: Number(m[1]), code: m[2] });
  }
  return out;
}

/* ---------- Validation ---------- */

export function validateAnswer(answer, questions) {
  const q = questions.find((q) => q.id === answer.questionId);
  if (!q) return { ok: false, error: `Unknown question: ${answer.questionId}` };
  const codes = Array.isArray(answer.choiceCode) ? answer.choiceCode : [answer.choiceCode];
  if (codes.length === 0) return { ok: false, error: `No choice selected for ${answer.questionId}` };
  if (codes.length > 1 && !q.multiSelect) {
    return { ok: false, error: `${answer.questionId} is single-select` };
  }
  for (const code of codes) {
    const choice = q.choices.find((c) => c.code === code);
    if (!choice) return { ok: false, error: `Unknown choice "${code}" for ${answer.questionId}` };
  }
  return { ok: true, question: q };
}

/* ---------- Scoring ---------- */

/**
 * Walk every answer, look up its choices in the question list, and
 * accumulate each choice's `scores` object into the user vector.
 *
 * @param {Array<{questionId, choiceCode: string|string[]}>} answers
 * @param {Array<Question>} questions
 * @param {object} [params] — { core, meta, metaWeight, clamp }
 */
export function scoreAnswers(answers, questions, params) {
  const { core, meta, clamp } = resolveParams(params);
  const vector = {};
  for (const k of [...core, ...meta]) vector[k] = 0;
  const known = new Set(Object.keys(vector));

  for (const a of answers) {
    const q = questions.find((q) => q.id === a.questionId);
    if (!q) continue;
    const codes = Array.isArray(a.choiceCode) ? a.choiceCode : [a.choiceCode];
    for (const code of codes) {
      const choice = q.choices.find((c) => c.code === code);
      if (!choice) continue;
      for (const [k, v] of Object.entries(choice.scores || {})) {
        if (!known.has(k)) continue;
        vector[k] += Number(v) || 0;
      }
    }
  }

  const cl = clampWith(clamp);
  for (const k of Object.keys(vector)) vector[k] = cl(vector[k]);
  return { vector };
}

/* ---------- Easter-egg rule engine ---------- */

/**
 * Evaluate a list of rules against the user's answers.
 * A rule's `constraints` map { questionId: choiceCode | null } means:
 *   - null/missing/blank → wildcard (matches any answer for that question)
 *   - string letter → must equal the user's choice (or be one of them, if multi)
 *
 * Rules are evaluated in priority order (highest first); first match wins.
 *
 * Returns the matched rule's `result` annotated with metadata, or null.
 */
export function checkEasterEggs(answers, rules) {
  if (!Array.isArray(rules) || rules.length === 0) return null;
  const byId = new Map();
  for (const a of answers) {
    byId.set(a.questionId, Array.isArray(a.choiceCode) ? a.choiceCode : [a.choiceCode]);
  }

  const sorted = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  for (const rule of sorted) {
    if (rule.enabled === false) continue;
    const constraints = rule.constraints || {};
    let matches = true;
    for (const [qid, expected] of Object.entries(constraints)) {
      if (expected === null || expected === undefined || expected === '') continue; // wildcard
      const userCodes = byId.get(qid) || [];
      if (!userCodes.includes(expected)) { matches = false; break; }
    }
    if (matches) {
      return {
        special: true,
        ruleId: rule.id,
        ruleLabel: rule.label || rule.id,
        ...(rule.result || {}),
      };
    }
  }
  return null;
}

// Back-compat shim — old name
export const checkSpecialRule = (answers) => null;

/* ---------- Matching ---------- */

export function distance(userVec, perfumeDna, params) {
  const { core, meta, metaWeight } = resolveParams(params);
  let d = 0;
  for (const p of core) d += Math.abs((userVec[p] ?? 0) - (perfumeDna[p] ?? 0));
  for (const p of meta) d += metaWeight * Math.abs((userVec[p] ?? 0) - (perfumeDna[p] ?? 0));
  return d;
}

export function matchPerfumes(userVec, perfumes, top = 3, params) {
  const ranked = perfumes
    .map((p) => ({ perfume: p, distance: distance(userVec, p.dna || {}, params) }))
    .sort((a, b) => a.distance - b.distance);
  return ranked.slice(0, top);
}

/* ---------- Reasons ---------- */

export function topReasons(userVec, perfumeDna, n = 3, params) {
  const { core, meta, metaWeight } = resolveParams(params);
  const all = [...core, ...meta];
  const rows = all.map((p) => {
    const u = userVec[p] ?? 0;
    const v = perfumeDna[p] ?? 0;
    const delta = Math.abs(u - v);
    const intensity = Math.abs(u);
    const weight = core.includes(p) ? 1 : metaWeight;
    return { param: p, user: u, perfume: v, delta, score: (intensity + 0.1) / (delta * weight + 0.5) };
  });
  rows.sort((a, b) => b.score - a.score);
  return rows.slice(0, n);
}

/* ---------- Legacy pattern matcher (kept for back-compat) ---------- */

export function matchPattern(userPattern, mappings, fallback = null) {
  if (!Array.isArray(mappings) || mappings.length === 0) return fallback;
  const userParts = parsePattern(userPattern);
  const userMap = new Map(userParts.map((p) => [p.order, p.code]));

  for (const m of mappings) {
    if (m.pattern === 'default') continue;
    if (!m.pattern.includes('*') && m.pattern === userPattern) return m;
  }
  for (const m of mappings) {
    if (m.pattern === 'default') continue;
    const parts = parsePattern(m.pattern);
    if (parts.length !== userParts.length) continue;
    const ok = parts.every((p) => p.code === '*' || userMap.get(p.order) === p.code);
    if (ok) return m;
  }
  return mappings.find((m) => m.pattern === 'default') || fallback;
}
