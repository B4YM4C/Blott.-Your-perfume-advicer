#!/usr/bin/env node
/**
 * Seed the SQL database with EVERY dataset from /data/*.json:
 *   - questions.json     → questions + choices (incl. multi_select + per-choice scores)
 *   - mappings.json      → result_mappings (legacy pattern table)
 *   - perfumes.json      → perfumes (vector-scoring DNA library, ~200 entries)
 *   - params.json        → params (single 'current' row)
 *   - easterEggs.json    → easter_eggs
 *
 * Idempotent — every insert is an UPSERT. Safe to re-run after edits.
 *
 * Pre-req: scripts/init-db.js must have applied the schema first.
 *
 * Usage:
 *   APP_MODE=production DATABASE_URL=postgres://... node scripts/seed-postgres.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
try { await import('dotenv/config'); } catch { /* dotenv optional */ }

import { sqlDb } from '../lib/db/sqlDb.js';

const DATA = path.join(process.cwd(), 'data');

function load(name, key) {
  const p = path.join(DATA, name);
  if (!fs.existsSync(p)) {
    console.warn(`[seed] ${name} not found — skipping`);
    return null;
  }
  const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw[key])) return raw[key];
  return raw;
}

async function run() {
  const questions = load('questions.json', 'questions') || [];
  const mappings  = load('mappings.json',  'mappings')  || [];
  const perfumes  = load('perfumes.json',  'perfumes')  || [];
  const eggs      = load('easterEggs.json','rules')     || [];
  const params    = load('params.json',    null);

  // ---- params (single row) ----
  if (params && typeof params === 'object' && !Array.isArray(params)) {
    console.log('[seed] writing params (1 row)...');
    await sqlDb.setParams({
      metaWeight: typeof params.metaWeight === 'number' ? params.metaWeight : 0.5,
      clamp: params.clamp || { min: -10, max: 10 },
      core: Array.isArray(params.core) ? params.core : [],
      meta: Array.isArray(params.meta) ? params.meta : [],
    });
  }

  // ---- questions + choices ----
  console.log(`[seed] inserting ${questions.length} questions...`);
  for (const q of questions) await sqlDb.upsertQuestion(q);

  // ---- mappings (legacy) ----
  if (mappings.length) {
    console.log(`[seed] inserting ${mappings.length} mappings...`);
    for (const m of mappings) await sqlDb.upsertMapping(m);
  }

  // ---- perfumes ----
  console.log(`[seed] inserting ${perfumes.length} perfumes...`);
  let i = 0;
  for (const p of perfumes) {
    await sqlDb.upsertPerfume(p);
    if (++i % 50 === 0) console.log(`[seed]   ...${i}/${perfumes.length}`);
  }

  // ---- easter eggs ----
  console.log(`[seed] inserting ${eggs.length} easter-egg rules...`);
  for (const r of eggs) await sqlDb.upsertEasterEgg(r);

  console.log('[seed] done.');
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
