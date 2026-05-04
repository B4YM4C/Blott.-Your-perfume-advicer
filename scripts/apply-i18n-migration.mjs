import dotenv from 'dotenv';
import pg from 'pg';

const envArg = process.argv.find((arg) => arg.startsWith('--env='));
if (envArg) dotenv.config({ path: envArg.slice('--env='.length) });

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('[apply-i18n-migration] DATABASE_URL or POSTGRES_URL is required');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: shouldUseSsl(url) ? { rejectUnauthorized: false } : false,
  max: 1,
});

try {
  await pool.query(`
    ALTER TABLE questions
      ADD COLUMN IF NOT EXISTS i18n JSONB NOT NULL DEFAULT '{}'::jsonb;

    ALTER TABLE choices
      ADD COLUMN IF NOT EXISTS i18n JSONB NOT NULL DEFAULT '{}'::jsonb;

    ALTER TABLE perfumes
      ADD COLUMN IF NOT EXISTS i18n JSONB NOT NULL DEFAULT '{}'::jsonb;
  `);
  console.log('[apply-i18n-migration] i18n columns are ready');
} finally {
  await pool.end();
}

function shouldUseSsl(connectionString) {
  if (process.env.DB_SSL === 'false') return false;
  return /sslmode=require/.test(connectionString) ||
    /\.neon\.tech/.test(connectionString) ||
    /\.vercel-storage\.com/.test(connectionString) ||
    /\.supabase\.co/.test(connectionString) ||
    process.env.DB_SSL === 'true';
}
