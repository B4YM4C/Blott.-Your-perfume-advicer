#!/usr/bin/env node
/**
 * One-shot DB initialiser.
 *
 * Reads the appropriate schema file and executes it against the configured DB.
 *   - Postgres (Neon, Vercel Postgres, Supabase): sql/schema.postgres.sql
 *   - MySQL: sql/schema.sql
 *
 * Driver is detected from DATABASE_URL prefix (postgres:// vs mysql://) or the
 * DB_DRIVER env var. Connection settings come from DATABASE_URL or the split
 * DB_HOST/DB_USER/DB_PASSWORD/DB_NAME variables.
 *
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/init-db.js
 *   DB_DRIVER=mysql DB_HOST=... DB_USER=... ... node scripts/init-db.js
 */

import fs from 'node:fs';
import path from 'node:path';
try { await import('dotenv/config'); } catch { /* dotenv optional */ }

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const explicit = (process.env.DB_DRIVER || '').toLowerCase();
const driver = explicit
  ? (explicit === 'pg' ? 'postgres' : explicit)
  : (url.startsWith('mysql://') ? 'mysql' : 'postgres');

const schemaFile = driver === 'mysql' ? 'schema.sql' : 'schema.postgres.sql';
const sqlPath = path.join(process.cwd(), 'sql', schemaFile);

if (!fs.existsSync(sqlPath)) {
  console.error(`Schema not found at ${sqlPath}`);
  process.exit(1);
}

const schema = fs.readFileSync(sqlPath, 'utf-8');

async function run() {
  if (driver === 'mysql') {
    const mysql = await import('mysql2/promise');
    const conn = url
      ? await mysql.createConnection(url + (url.includes('?') ? '&' : '?') + 'multipleStatements=true')
      : await mysql.createConnection({
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT || 3306),
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          multipleStatements: true,
        });
    console.log(`[init-db] connected to MySQL, applying ${schemaFile}...`);
    await conn.query(schema);
    await conn.end();
    console.log('[init-db] done.');
  } else {
    const { Client } = await import('pg');
    const needSsl = /sslmode=require|\.neon\.tech|\.vercel-storage\.com|\.supabase\.co/.test(url) || process.env.DB_SSL === 'true';
    const c = url
      ? new Client({ connectionString: url, ssl: needSsl ? { rejectUnauthorized: false } : false })
      : new Client({
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT || 5432),
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        });
    await c.connect();
    console.log(`[init-db] connected to Postgres, applying ${schemaFile}...`);
    await c.query(schema);
    await c.end();
    console.log('[init-db] done.');
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
