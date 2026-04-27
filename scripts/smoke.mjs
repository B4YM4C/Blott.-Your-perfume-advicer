// Smoke test for Blott quiz logic + admin data wiring
// Runs without a Next server: imports the lib directly + reads JSON seeds.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  resolveParams,
  scoreAnswers,
  validateAnswer,
  checkEasterEggs,
  matchPerfumes,
  distance,
  topReasons,
  buildPattern,
} from '../lib/quizLogic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
}

const ok = (label) => console.log(`  \u2713 ${label}`);
const fail = (label, detail) => {
  console.log(`  \u2717 ${label}`);
  if (detail) console.log('    ', detail);
  process.exitCode = 1;
};
function group(title, fn) {
  console.log(`\n\u2014 ${title} \u2014`);
  try { fn(); }
  catch (e) { fail('threw', e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')); }
}

// Build answers in the {questionId, choiceCode} array shape that the lib expects
function answersFromMap(map) {
  return Object.entries(map).map(([qid, code]) => ({ questionId: qid, choiceCode: code }));
}

// ---- Load seeds ----
function unwrap(v, key) {
  if (Array.isArray(v)) return v;
  if (v && Array.isArray(v[key])) return v[key];
  return [];
}
const params    = loadJSON('data/params.json');
const qFile     = loadJSON('data/questions.json');
const pFile     = loadJSON('data/perfumes.json');
const eFile     = loadJSON('data/easterEggs.json');
const questions = unwrap(qFile, 'questions');
const perfumes  = unwrap(pFile, 'perfumes');
const eggs      = unwrap(eFile, 'rules');

// Add questionOrder to answers when needed
function withOrder(arr) {
  return arr.map((a) => {
    const q = questions.find((q) => q.id === a.questionId);
    return { ...a, questionOrder: q?.order ?? 0 };
  });
}

// ---- 1. Params shape ----
group('params.json shape', () => {
  const r = resolveParams(params);
  if (!Array.isArray(r.core) || r.core.length === 0) fail('core present');
  else ok(`core = ${r.core.length} axes (${r.core.join(', ')})`);
  if (!Array.isArray(r.meta)) fail('meta present');
  else ok(`meta = ${r.meta.length} axes (${r.meta.join(', ')})`);
  if (typeof r.metaWeight !== 'number') fail('metaWeight is number');
  else ok(`metaWeight = ${r.metaWeight}`);
  if (typeof r.clamp?.min !== 'number' || typeof r.clamp?.max !== 'number') fail('clamp');
  else ok(`clamp = [${r.clamp.min}, ${r.clamp.max}]`);
});

// ---- 2. Questions shape ----
group('questions.json shape', () => {
  if (!Array.isArray(questions) || questions.length === 0) return fail('questions present');
  ok(`${questions.length} questions`);
  let multiCount = 0;
  let badQ = 0;
  for (const q of questions) {
    if (!q.id || !Array.isArray(q.choices) || q.choices.length === 0) {
      fail(`Q${q.order || '?'} (${q.id}) malformed`);
      badQ++;
      continue;
    }
    if (q.multiSelect) multiCount++;
    for (const c of q.choices) {
      if (!c.code || !c.label) { fail(`Q${q.order} choice ${c.code} missing fields`); badQ++; break; }
    }
  }
  if (!badQ) ok(`every question well-formed`);
  ok(`multiSelect questions: ${multiCount}`);
});

// ---- 3. Perfumes DNA ----
group('perfumes.json shape', () => {
  if (!Array.isArray(perfumes) || perfumes.length === 0) return fail('perfumes present');
  ok(`${perfumes.length} perfumes`);
  const r = resolveParams(params);
  const axes = [...r.core, ...r.meta];
  let missing = 0;
  for (const p of perfumes) {
    if (!p.dna) { fail(`${p.id} no dna`); continue; }
    for (const a of axes) {
      if (typeof p.dna[a] !== 'number') missing++;
    }
  }
  if (missing) console.log(`     note: ${missing} missing axis values across perfumes (treated as 0)`);
  ok('every perfume has a dna object');
});

// ---- 4. Validation ----
group('validateAnswer', () => {
  const q0 = questions[0];
  const good = validateAnswer({ questionId: q0.id, choiceCode: q0.choices[0].code }, questions);
  if (!good.ok) return fail('valid single-select rejected', good.error);
  ok('valid single-select accepted');

  const bad = validateAnswer({ questionId: q0.id, choiceCode: 'ZZZ' }, questions);
  if (bad.ok) fail('unknown code accepted'); else ok('unknown code rejected');

  // Find a multi-select question if any
  const multiQ = questions.find((q) => q.multiSelect && q.choices.length >= 2);
  if (multiQ) {
    const arr = validateAnswer({ questionId: multiQ.id, choiceCode: [multiQ.choices[0].code, multiQ.choices[1].code] }, questions);
    if (!arr.ok) fail('valid multi-select rejected', arr.error);
    else ok('valid multi-select accepted');
  } else {
    // No multi-select questions in seed → ensure single-select rejects an array
    const arr = validateAnswer({ questionId: q0.id, choiceCode: [q0.choices[0].code, q0.choices[0].code] }, questions);
    if (arr.ok) fail('multi-array accepted on single-select question');
    else ok('multi-array rejected on single-select question');
  }
});

// ---- 5. Score answers ----
group('scoreAnswers — single + multi-select', () => {
  // Single-select per question (first choice each)
  const singleMap = {};
  for (const q of questions) singleMap[q.id] = q.choices[0].code;
  const result1 = scoreAnswers(answersFromMap(singleMap), questions, params);
  const v1 = result1.vector;
  if (!v1) return fail('no vector returned');
  ok(`single-select vector keys = ${Object.keys(v1).length}`);

  // Multi-select on Q1 (force two codes regardless of multiSelect flag — score should still sum)
  const multiMap = { ...singleMap };
  const q0 = questions[0];
  multiMap[q0.id] = [q0.choices[0].code, q0.choices[1] ? q0.choices[1].code : q0.choices[0].code];
  const result2 = scoreAnswers(answersFromMap(multiMap), questions, params);
  const v2 = result2.vector;
  ok('multi-select scoring did not throw');

  // Verify clamp
  const r = resolveParams(params);
  let outOfRange = 0;
  for (const [k, val] of Object.entries(v2)) {
    if (val < r.clamp.min || val > r.clamp.max) outOfRange++;
  }
  if (outOfRange) fail(`${outOfRange} axes outside clamp`);
  else ok(`vector inside clamp [${r.clamp.min}, ${r.clamp.max}]`);
});

// ---- 6. Easter egg rule ----
group('checkEasterEggs — biew + vangard', () => {
  if (eggs.length === 0) return fail('no easter-egg rules in seed');
  ok(`${eggs.length} rule(s) loaded`);

  const map = {};
  for (const q of questions) map[q.id] = q.choices[0].code;
  const q4 = questions.find((q) => q.order === 4);
  const q5 = questions.find((q) => q.order === 5);
  if (!q4 || !q5) return fail('Q4 / Q5 not found');
  // Force the rule's expected codes
  map[q4.id] = 'D';
  map[q5.id] = 'J';

  const hit = checkEasterEggs(answersFromMap(map), eggs);
  if (!hit) return fail('rule did NOT fire — seed may not encode Q4=D∧Q5=J');
  ok(`rule fired: ${hit.ruleId} → "${hit.fragrance}"`);
  if (!hit.special) fail('hit.special missing');

  // Wildcard test: change Q1, rule should still fire
  const map2 = { ...map };
  const q1 = questions.find((q) => q.order === 1);
  if (q1 && q1.choices[1]) map2[q1.id] = q1.choices[1].code;
  const hit2 = checkEasterEggs(answersFromMap(map2), eggs);
  if (!hit2 || hit2.ruleId !== hit.ruleId) fail('wildcard semantics broken — Q1 swap killed the match');
  else ok('wildcard semantics work (unrelated Q1 ignored)');

  // Negative: differ on Q4, rule should not fire
  const map3 = { ...map };
  if (q4.choices[1]) map3[q4.id] = q4.choices[1].code;
  const hit3 = checkEasterEggs(answersFromMap(map3), eggs);
  if (hit3 && hit3.ruleId === hit.ruleId) fail('rule fired with Q4 changed — should not');
  else ok('rule does NOT fire when Q4 differs');
});

// ---- 7. matchPerfumes ----
group('matchPerfumes — top 3', () => {
  const map = {};
  for (const q of questions) map[q.id] = q.choices[0].code;
  const { vector } = scoreAnswers(answersFromMap(map), questions, params);
  const top = matchPerfumes(vector, perfumes, 3, params);
  if (top.length !== 3) return fail(`expected 3, got ${top.length}`);
  ok(`top-3: ${top.map((t) => t.perfume.id).join(', ')}`);

  for (let i = 1; i < top.length; i++) {
    if (top[i].distance < top[i - 1].distance) {
      fail(`distances not ascending at index ${i}`);
      break;
    }
  }
  ok(`distances ascending (${top.map((t) => t.distance.toFixed(2)).join(' \u2264 ')})`);

  const reasons = topReasons(vector, top[0].perfume.dna, 3, params);
  ok(`top reasons (best match): ${reasons.length} bullets`);
});

// ---- 8. End-to-end "submit" simulation ----
group('end-to-end submit (simulated)', () => {
  const map = {};
  for (const q of questions) {
    if (q.multiSelect && q.choices.length >= 2) map[q.id] = [q.choices[0].code, q.choices[1].code];
    else map[q.id] = q.choices[0].code;
  }
  const ans = answersFromMap(map);
  // Validate every answer
  for (const a of ans) {
    const v = validateAnswer(a, questions);
    if (!v.ok) return fail(`validation failed: ${v.error}`);
  }
  ok('all answers validate');

  const egg = checkEasterEggs(ans, eggs);
  if (egg) {
    ok(`short-circuited via egg: "${egg.fragrance}"`);
  } else {
    const { vector } = scoreAnswers(ans, questions, params);
    const top = matchPerfumes(vector, perfumes, 3, params);
    ok(`scored \u2192 top1 = ${top[0].perfume.fragrance} (d=${top[0].distance.toFixed(2)})`);
  }
});

// ---- 9. Admin file presence ----
group('admin API + page files', () => {
  const must = [
    'app/admin/_ui.js',
    'app/admin/layout.jsx',
    'app/admin/params/page.jsx',
    'app/admin/params/ParamsEditor.jsx',
    'app/admin/perfumes/page.jsx',
    'app/admin/perfumes/[id]/page.jsx',
    'app/admin/perfumes/[id]/PerfumeEditor.jsx',
    'app/admin/perfumes/new/page.jsx',
    'app/admin/easter-eggs/page.jsx',
    'app/admin/easter-eggs/[id]/page.jsx',
    'app/admin/easter-eggs/[id]/EggEditor.jsx',
    'app/admin/easter-eggs/new/page.jsx',
    'app/admin/questions/[id]/QuestionEditor.jsx',
    'app/api/admin/params/route.js',
    'app/api/admin/perfumes/route.js',
    'app/api/admin/perfumes/[id]/route.js',
    'app/api/admin/easter-eggs/route.js',
    'app/api/admin/easter-eggs/[id]/route.js',
    'app/api/admin/upload/route.js',
  ];
  let missing = 0;
  for (const f of must) {
    if (!fs.existsSync(path.join(root, f))) { fail(`missing ${f}`); missing++; }
  }
  if (!missing) ok(`all ${must.length} admin files present`);
});

console.log(process.exitCode ? '\n\u2717 smoke test FAILED\n' : '\n\u2713 smoke test passed\n');
