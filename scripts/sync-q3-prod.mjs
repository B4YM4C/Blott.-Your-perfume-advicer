#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

const envFile = process.env.ENV_FILE || path.join(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) dotenv.config({ path: envFile });
dotenv.config();

function needSsl(url) {
  if (process.env.DB_SSL === 'false') return false;
  return /sslmode=require/.test(url) || /\.neon\.tech/.test(url) || /\.vercel-storage\.com/.test(url) ||
    /\.supabase\.co/.test(url) || process.env.DB_SSL === 'true';
}

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!dbUrl) {
  console.error('[sync-q3] Missing DATABASE_URL or POSTGRES_URL');
  process.exit(1);
}

const questionsPath = path.join(process.cwd(), 'data', 'questions.json');
const seed = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
const q3 = seed.questions?.find((question) => question.id === 'q3');
if (!q3) {
  console.error('[sync-q3] q3 not found in data/questions.json');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: needSsl(dbUrl) ? { rejectUnauthorized: false } : false,
  max: 1,
});

try {
  await pool.query("ALTER TABLE choices ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb");
  await pool.end();

  const { sqlDb } = await import('../lib/db/sqlDb.js');
  await sqlDb.upsertQuestion(q3);

  const saved = await sqlDb.getQuestion('q3');
  console.log(`[sync-q3] q3 choices in DB: ${saved?.choices?.length || 0}`);
  console.log(`[sync-q3] q3 score-bearing choices: ${(saved?.choices || []).filter((choice) => Object.keys(choice.scores || {}).length > 0).length}`);
  console.log(`[sync-q3] q3 choices with image lists: ${(saved?.choices || []).filter((choice) => (choice.images || []).length > 1).length}`);
  process.exit(0);
} catch (error) {
  try { await pool.end(); } catch {}
  console.error('[sync-q3] failed:', error.message);
  process.exit(1);
}
