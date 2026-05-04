#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';

const args = parseArgs(process.argv.slice(2));
if (args.env) dotenv.config({ path: args.env });

const ROOT = process.cwd();
const PERFUME_FILE = path.join(ROOT, 'data', 'perfumes.json');
const PARAMS_FILE = path.join(ROOT, 'data', 'params.json');

const FEMININE_HINTS = [
  'for her', ' her ', 'woman', 'women', 'miss', 'girl', 'good girl', 'jadore',
  'flora', 'chloe', 'daisy', 'cloud', 'si ', 'oriana', 'delina', 'paradoxe',
  'rose', 'roses', 'peony', 'jasmine', 'tuberose', 'violet', 'iris',
  'strawberry', 'raspberry', 'pear', 'vanilla', 'coconut', 'caramel',
  'gourmand', 'floral fruity', 'floral gourmand', 'floral',
];

const MASCULINE_HINTS = [
  'for him', ' him ', 'homme', 'pour homme', 'man', 'men', 'gentleman',
  'sauvage', 'aventus', 'explorer', 'legend', 'terre', 'boss', 'wanted',
  'eros', 'invictus', 'luna rossa', 'acqua di gio', 'oud wood',
  'leather', 'tobacco', 'vetiver', 'cedar', 'cedarwood', 'patchouli',
  'oakmoss', 'pepper', 'cardamom', 'lavender', 'sage', 'ambroxan',
  'woody aromatic', 'aromatic spicy', 'fougere', 'leather', 'woody spicy',
];

const UNISEX_HINTS = [
  'unisex', 'santal', 'le labo', 'diptyque', 'byredo', 'maison margiela',
  'jardin', 'fig', 'bergamot', 'musk', 'citrus aromatic',
];

const BRAND_GENDER = [
  { re: /\bchanel\b|\bdior\b|\bgucci\b|\bchloe\b|\bmarc jacobs\b|\bariana grande\b/i, value: -1 },
  { re: /\bmontblanc\b|\bboss\b|\blacoste\b|\baz(z)?aro\b|\bdavidoff\b/i, value: 2 },
  { re: /\btom ford\b|\ble labo\b|\bdiptyque\b|\bmaison francis\b|\bcreed\b/i, value: 0 },
];

const DESCRIPTION = '+ masculine/ความเป็นชาย, - feminine/ความเป็นผู้หญิง';

main().catch((err) => {
  console.error('[rebalance-masculine] failed:', err.message);
  process.exit(1);
});

async function main() {
  const local = rebalanceLocalFiles();
  printReport('local JSON', local);

  if (args.db === 'true' || args.db === '1') {
    const db = await rebalanceDatabase();
    printReport('production DB', db);
  }
}

function rebalanceLocalFiles() {
  const file = JSON.parse(fs.readFileSync(PERFUME_FILE, 'utf8'));
  const perfumes = Array.isArray(file) ? file : file.perfumes || [];
  const changed = [];
  for (const p of perfumes) {
    p.dna ||= {};
    const before = Number(p.dna.Masculine ?? 0);
    const after = masculineScore(p);
    p.dna.Masculine = after;
    if (before !== after) changed.push({ id: p.id, fragrance: p.fragrance, before, after });
  }

  fs.writeFileSync(PERFUME_FILE, `${JSON.stringify({ ...file, perfumes }, null, 2)}\n`);

  const params = JSON.parse(fs.readFileSync(PARAMS_FILE, 'utf8'));
  params.core = (params.core || []).map((axis) => axis.name === 'Masculine'
    ? { ...axis, description: DESCRIPTION }
    : axis);
  fs.writeFileSync(PARAMS_FILE, `${JSON.stringify(params, null, 2)}\n`);

  return { total: perfumes.length, changed };
}

async function rebalanceDatabase() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  if (!url) throw new Error('Missing DATABASE_URL/POSTGRES_URL');
  const isMysql = url.startsWith('mysql://') || (process.env.DB_DRIVER || '').toLowerCase() === 'mysql';
  return isMysql ? rebalanceMysql(url) : rebalancePostgres(url);
}

async function rebalancePostgres(url) {
  const { Pool } = await import('pg');
  const pool = new Pool({
    connectionString: url,
    ssl: needSsl(url) ? { rejectUnauthorized: false } : false,
    max: 2,
  });
  try {
    const res = await pool.query('SELECT id, fragrance, house, family, notes, dna FROM perfumes ORDER BY id');
    const changed = [];
    for (const row of res.rows) {
      const p = {
        id: row.id,
        fragrance: row.fragrance,
        house: row.house,
        family: row.family,
        notes: asJson(row.notes, []),
        dna: asJson(row.dna, {}),
      };
      const before = Number(p.dna.Masculine ?? 0);
      const after = masculineScore(p);
      p.dna.Masculine = after;
      if (before !== after) changed.push({ id: p.id, fragrance: p.fragrance, before, after });
      await pool.query('UPDATE perfumes SET dna = $2::jsonb, updated_at = NOW() WHERE id = $1', [p.id, JSON.stringify(p.dna)]);
    }

    const params = await pool.query("SELECT core FROM params WHERE id = 'current'");
    const core = asJson(params.rows[0]?.core, []).map((axis) => axis.name === 'Masculine'
      ? { ...axis, description: DESCRIPTION }
      : axis);
    await pool.query("UPDATE params SET core = $1::jsonb, updated_at = NOW() WHERE id = 'current'", [JSON.stringify(core)]);

    return { total: res.rows.length, changed };
  } finally {
    await pool.end();
  }
}

async function rebalanceMysql(url) {
  const mysql = await import('mysql2/promise');
  const pool = await mysql.createPool(url);
  try {
    const [rows] = await pool.execute('SELECT id, fragrance, house, family, notes, dna FROM perfumes ORDER BY id');
    const changed = [];
    for (const row of rows) {
      const p = {
        id: row.id,
        fragrance: row.fragrance,
        house: row.house,
        family: row.family,
        notes: asJson(row.notes, []),
        dna: asJson(row.dna, {}),
      };
      const before = Number(p.dna.Masculine ?? 0);
      const after = masculineScore(p);
      p.dna.Masculine = after;
      if (before !== after) changed.push({ id: p.id, fragrance: p.fragrance, before, after });
      await pool.execute('UPDATE perfumes SET dna = ?, updated_at = NOW() WHERE id = ?', [JSON.stringify(p.dna), p.id]);
    }

    const [params] = await pool.execute("SELECT core FROM params WHERE id = 'current'");
    const core = asJson(params[0]?.core, []).map((axis) => axis.name === 'Masculine'
      ? { ...axis, description: DESCRIPTION }
      : axis);
    await pool.execute("UPDATE params SET core = ?, updated_at = NOW() WHERE id = 'current'", [JSON.stringify(core)]);

    return { total: rows.length, changed };
  } finally {
    await pool.end();
  }
}

function masculineScore(perfume) {
  const text = [
    perfume.fragrance,
    perfume.house,
    perfume.family,
    ...(Array.isArray(perfume.notes) ? perfume.notes : []),
    perfume.blurb,
  ].filter(Boolean).join(' ').toLowerCase();

  let score = 0;
  for (const hint of MASCULINE_HINTS) if (hasHint(text, hint)) score += hintStrength(hint);
  for (const hint of FEMININE_HINTS) if (hasHint(text, hint)) score -= hintStrength(hint);
  for (const hint of UNISEX_HINTS) if (hasHint(text, hint)) score *= 0.72;
  for (const brand of BRAND_GENDER) if (brand.re.test(text)) score += brand.value;

  const family = String(perfume.family || '').toLowerCase();
  if (/floral|fruity|gourmand/.test(family)) score -= 1.5;
  if (/woody|aromatic|spicy|leather|fougere|chypre/.test(family)) score += 1.5;
  if (/citrus|musk/.test(family)) score *= 0.82;

  // Keep the score deterministic/idempotent. Re-running this script should
  // not keep drifting values toward either side.
  return clamp(Math.round(score), -10, 10);
}

function hintStrength(hint) {
  if (/\bman\b|\bhomme\b|\bwoman\b|\bmiss\b|for him|for her/.test(hint)) return 4;
  if (/leather|tobacco|oud|rose|jasmine|vanilla|gourmand/.test(hint)) return 2.5;
  return 1.4;
}

function hasHint(text, rawHint) {
  const hint = rawHint.trim();
  if (!hint) return false;
  // Word-boundary matching avoids false positives like "man" inside "woman"
  // or "her" inside "Hermes".
  const pattern = hint
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  return new RegExp(`\\b${pattern}\\b`, 'i').test(text);
}

function asJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function needSsl(url) {
  if (process.env.DB_SSL === 'false') return false;
  return /sslmode=require/.test(url) || /\.neon\.tech/.test(url) ||
    /\.vercel-storage\.com/.test(url) || /\.supabase\.co/.test(url) ||
    process.env.DB_SSL === 'true';
}

function printReport(label, report) {
  const changed = report.changed || [];
  const dist = changed.reduce((acc, row) => {
    const bucket = row.after <= -5 ? 'feminine' : row.after >= 5 ? 'masculine' : 'neutral';
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});
  console.log(`[rebalance-masculine] ${label}: total=${report.total} changed=${changed.length} feminine=${dist.feminine || 0} neutral=${dist.neutral || 0} masculine=${dist.masculine || 0}`);
  for (const row of changed.slice(0, 12)) {
    console.log(`  ${row.id}: ${row.before} -> ${row.after}  ${row.fragrance}`);
  }
  if (changed.length > 12) console.log(`  ... ${changed.length - 12} more`);
}
