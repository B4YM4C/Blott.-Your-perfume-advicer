#!/usr/bin/env node
/**
 * Seed the SQL database with questions + result mappings from /data/*.json.
 * Run AFTER scripts/init-db.js.
 *
 * Usage:
 *   APP_MODE=production node scripts/seed.js
 */

import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';

import { sqlDb } from '../lib/db/sqlDb.js';

const DATA = path.join(process.cwd(), 'data');

async function run() {
  const qs = JSON.parse(fs.readFileSync(path.join(DATA, 'questions.json'), 'utf-8')).questions;
  const ms = JSON.parse(fs.readFileSync(path.join(DATA, 'mappings.json'), 'utf-8')).mappings;

  console.log(`[seed] inserting ${qs.length} questions...`);
  for (const q of qs) await sqlDb.upsertQuestion(q);

  console.log(`[seed] inserting ${ms.length} mappings...`);
  for (const m of ms) await sqlDb.upsertMapping(m);

  console.log('[seed] done.');
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
