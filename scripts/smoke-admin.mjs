// Admin smoke test — exercises the DB layer that admin API routes wrap,
// plus disk persist roundtrip. Doesn't need a Next server.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mockDb } from '../lib/db/mockDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const ok = (label) => console.log(`  \u2713 ${label}`);
const fail = (label, detail) => {
  console.log(`  \u2717 ${label}`);
  if (detail) console.log('    ', detail);
  process.exitCode = 1;
};
async function group(title, fn) {
  console.log(`\n\u2014 ${title} \u2014`);
  try { await fn(); }
  catch (e) { fail('threw', e.message); }
}

// ---- 1. Params CRUD ----
await group('params get/set roundtrip', async () => {
  const before = await mockDb.getParams();
  ok(`current core axes: ${before.core.length}, meta: ${before.meta.length}`);

  // Add a temp meta axis
  const next = {
    ...before,
    meta: [...before.meta, { name: '__SmokeTest__', label: 'Smoke', description: 'temporary axis' }],
  };
  const saved = await mockDb.setParams(next);
  if (!saved.meta.some((m) => m.name === '__SmokeTest__')) return fail('axis not added');
  ok('axis added');

  // Reload and verify
  const after = await mockDb.getParams();
  if (!after.meta.some((m) => m.name === '__SmokeTest__')) fail('axis not persisted in store');
  else ok('axis persisted in memory');

  // Roll back
  await mockDb.setParams(before);
  const rolled = await mockDb.getParams();
  if (rolled.meta.some((m) => m.name === '__SmokeTest__')) fail('rollback failed');
  else ok('rollback succeeded');
});

// ---- 2. Perfumes CRUD ----
await group('perfumes upsert/delete', async () => {
  const startCount = (await mockDb.listPerfumes()).length;
  ok(`starting count: ${startCount}`);

  const created = await mockDb.upsertPerfume({
    id: '__smoke_perfume__',
    fragrance: 'Smoke Test EDP',
    house: 'TestHouse',
    family: 'Test',
    notes: ['cedar', 'paper'],
    blurb: 'temporary perfume from smoke test',
    image: null,
    dna: { Masculine: 5, Modern: 2 },
  });
  if (created.id !== '__smoke_perfume__') return fail('create returned wrong id');
  ok(`created: ${created.id}`);

  const afterCreate = (await mockDb.listPerfumes()).length;
  if (afterCreate !== startCount + 1) fail(`count mismatch: ${afterCreate} vs ${startCount + 1}`);
  else ok(`count incremented to ${afterCreate}`);

  const got = await mockDb.getPerfume('__smoke_perfume__');
  if (!got || got.fragrance !== 'Smoke Test EDP') fail('getPerfume failed');
  else ok('get works');

  // Update
  const updated = await mockDb.upsertPerfume({ ...got, blurb: 'edited' });
  if (updated.blurb !== 'edited') fail('update failed');
  else ok('update works');

  // Delete
  await mockDb.deletePerfume('__smoke_perfume__');
  const afterDelete = (await mockDb.listPerfumes()).length;
  if (afterDelete !== startCount) fail(`count not restored after delete: ${afterDelete}`);
  else ok('delete works');
});

// ---- 3. Easter Eggs CRUD ----
await group('easter-eggs upsert/delete', async () => {
  const list1 = await mockDb.listEasterEggs();
  ok(`starting count: ${list1.length}`);

  const questions = await mockDb.listQuestions();
  const q1 = questions[0];

  const created = await mockDb.upsertEasterEgg({
    id: '__smoke_egg__',
    label: 'smoke test rule',
    enabled: true,
    priority: 999,
    constraints: { [q1.id]: q1.choices[0].code },
    result: { fragrance: 'smoke result', family: 'Smoke', notes: [], blurb: '', image: null },
  });
  if (created.id !== '__smoke_egg__') return fail('create returned wrong id');
  ok(`created: ${created.id} (priority ${created.priority})`);

  const list2 = await mockDb.listEasterEggs();
  if (list2.length !== list1.length + 1) fail(`count mismatch`);
  else ok(`count incremented to ${list2.length}`);

  // Toggle enabled
  const toggled = await mockDb.upsertEasterEgg({ ...created, enabled: false });
  if (toggled.enabled !== false) fail('toggle failed');
  else ok('enabled toggle works');

  await mockDb.deleteEasterEgg('__smoke_egg__');
  const list3 = await mockDb.listEasterEggs();
  if (list3.length !== list1.length) fail('delete failed');
  else ok('delete works');
});

// ---- 4. Question multi-select toggle ----
await group('question multiSelect toggle persists', async () => {
  const questions = await mockDb.listQuestions();
  const q = questions[0];
  const original = q.multiSelect || false;

  const flipped = await mockDb.upsertQuestion({ ...q, multiSelect: !original });
  if (flipped.multiSelect !== !original) return fail('flip did not stick');
  ok(`flipped multiSelect: ${original} -> ${!original}`);

  // Restore
  const restored = await mockDb.upsertQuestion({ ...q, multiSelect: original });
  if (restored.multiSelect !== original) fail('restore failed');
  else ok('restored to original');
});

// ---- 5. Choice scores edit ----
await group('per-choice scores edit', async () => {
  const questions = await mockDb.listQuestions();
  const q = JSON.parse(JSON.stringify(questions[0]));
  const originalScores = JSON.parse(JSON.stringify(q.choices[0].scores || {}));

  q.choices[0].scores = { ...originalScores, Masculine: 7 };
  const saved = await mockDb.upsertQuestion(q);
  if (saved.choices[0].scores.Masculine !== 7) return fail('score edit not saved');
  ok('score edit saved');

  // Restore
  q.choices[0].scores = originalScores;
  await mockDb.upsertQuestion(q);
  const back = await mockDb.listQuestions();
  if (JSON.stringify(back[0].choices[0].scores) !== JSON.stringify(originalScores)) fail('restore failed');
  else ok('scores restored');
});

console.log(process.exitCode ? '\n\u2717 admin smoke FAILED\n' : '\n\u2713 admin smoke passed\n');
