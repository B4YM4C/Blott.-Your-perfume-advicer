#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';

const args = parseArgs(process.argv.slice(2));
if (args.env) dotenv.config({ path: args.env });

const limit = Number(args.limit || 3);
const output = args.output || '';

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const explicit = (process.env.DB_DRIVER || '').toLowerCase();
const driver = explicit || (url.startsWith('mysql://') ? 'mysql' : 'postgres');

const redactColumns = new Set([
  'email',
  'user_agent',
  'referrer',
  'payload',
  'result_blob',
]);

const tableOrder = [
  'users',
  'sessions',
  'questions',
  'choices',
  'answers',
  'result_mappings',
  'results',
  'perfumes',
  'params',
  'easter_eggs',
  'site_copy',
  'tracking_events',
  'consent_log',
];

main().catch((err) => {
  console.error('[print-db-tables] failed:', err.message);
  process.exit(1);
});

async function main() {
  const db = driver === 'mysql' ? await mysqlDb() : await postgresDb();
  const tables = await db.listTables();
  const ordered = [
    ...tableOrder.filter((t) => tables.includes(t)),
    ...tables.filter((t) => !tableOrder.includes(t)).sort(),
  ];

  const lines = [];
  lines.push('# Blot. Database Table Printout');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Driver: ${driver}`);
  lines.push(`Sample rows per table: ${limit}`);
  lines.push('');
  lines.push('Sensitive-ish fields are redacted in this report: `email`, `user_agent`, `referrer`, `payload`, `result_blob`.');
  lines.push('');
  lines.push('## Table Summary');
  lines.push('');
  lines.push('| Table | Rows | Columns |');
  lines.push('|---|---:|---:|');

  const details = [];
  for (const table of ordered) {
    const columns = await db.columns(table);
    const count = await db.count(table);
    const rows = await db.sample(table, limit, columns);
    lines.push(`| ${table} | ${count} | ${columns.length} |`);
    details.push({ table, columns, count, rows });
  }

  lines.push('');
  lines.push('## Table Details');

  for (const detail of details) {
    lines.push('');
    lines.push(`### ${detail.table}`);
    lines.push('');
    lines.push(`Rows: ${detail.count}`);
    lines.push('');
    lines.push('Columns:');
    lines.push('');
    lines.push('| Column | Type | Nullable | Default |');
    lines.push('|---|---|---|---|');
    for (const c of detail.columns) {
      lines.push(`| ${c.name} | ${escapeCell(c.type)} | ${c.nullable ? 'yes' : 'no'} | ${escapeCell(c.defaultValue || '')} |`);
    }
    lines.push('');
    lines.push(`Sample rows (limit ${limit}):`);
    lines.push('');
    if (detail.rows.length === 0) {
      lines.push('_No rows_');
      continue;
    }
    lines.push('```json');
    lines.push(JSON.stringify(detail.rows.map(redactRow), null, 2));
    lines.push('```');
  }

  const text = `${lines.join('\n')}\n`;
  if (output) {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, text);
    console.log(`Wrote ${output}`);
  } else {
    process.stdout.write(text);
  }

  await db.close();
}

async function postgresDb() {
  const { Pool } = await import('pg');
  const pool = new Pool({
    connectionString: url || undefined,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: needSsl(url) ? { rejectUnauthorized: false } : false,
    max: 2,
  });
  return {
    async listTables() {
      const res = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      return res.rows.map((r) => r.table_name);
    },
    async columns(table) {
      const res = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      return res.rows.map((r) => ({
        name: r.column_name,
        type: r.data_type,
        nullable: r.is_nullable === 'YES',
        defaultValue: r.column_default,
      }));
    },
    async count(table) {
      const res = await pool.query(`SELECT COUNT(*)::int AS c FROM ${ident(table)}`);
      return res.rows[0]?.c || 0;
    },
    async sample(table, rowLimit, columns) {
      const order = columns.some((c) => c.name === 'id') ? ' ORDER BY id ASC' : '';
      const res = await pool.query(`SELECT * FROM ${ident(table)}${order} LIMIT $1`, [rowLimit]);
      return res.rows;
    },
    close() {
      return pool.end();
    },
  };
}

async function mysqlDb() {
  const mysql = await import('mysql2/promise');
  const pool = url
    ? await mysql.createPool(url)
    : await mysql.createPool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });
  const dbName = process.env.DB_NAME || (url ? new URL(url).pathname.replace(/^\//, '') : '');
  return {
    async listTables() {
      const [rows] = await pool.execute(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = ?
        ORDER BY table_name
      `, [dbName]);
      return rows.map((r) => r.TABLE_NAME || r.table_name);
    },
    async columns(table) {
      const [rows] = await pool.execute(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = ? AND table_name = ?
        ORDER BY ordinal_position
      `, [dbName, table]);
      return rows.map((r) => ({
        name: r.COLUMN_NAME || r.column_name,
        type: r.DATA_TYPE || r.data_type,
        nullable: (r.IS_NULLABLE || r.is_nullable) === 'YES',
        defaultValue: r.COLUMN_DEFAULT || r.column_default,
      }));
    },
    async count(table) {
      const [rows] = await pool.execute(`SELECT COUNT(*) AS c FROM ${ident(table, '`')}`);
      return Number(rows[0]?.c || 0);
    },
    async sample(table, rowLimit, columns) {
      const order = columns.some((c) => c.name === 'id') ? ' ORDER BY id ASC' : '';
      const [rows] = await pool.execute(`SELECT * FROM ${ident(table, '`')}${order} LIMIT ?`, [rowLimit]);
      return rows;
    },
    close() {
      return pool.end();
    },
  };
}

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function needSsl(connectionString) {
  if (process.env.DB_SSL === 'false') return false;
  return /sslmode=require/.test(connectionString) ||
    /\.neon\.tech/.test(connectionString) ||
    /\.vercel-storage\.com/.test(connectionString) ||
    /\.supabase\.co/.test(connectionString) ||
    process.env.DB_SSL === 'true';
}

function ident(name, quote = '"') {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) throw new Error(`Unsafe SQL identifier: ${name}`);
  return `${quote}${name}${quote}`;
}

function redactRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = redactColumns.has(key) ? '[redacted]' : compact(value);
  }
  return out;
}

function compact(value) {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const json = JSON.stringify(value);
    if (json.length > 700) return `${json.slice(0, 700)}... [truncated]`;
    return value;
  }
  if (typeof value === 'string' && value.length > 700) return `${value.slice(0, 700)}... [truncated]`;
  return value;
}

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
