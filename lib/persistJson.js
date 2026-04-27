/**
 * Disk-write fallback used by admin API routes.
 *
 * In APP_MODE=local: write JSON seeds to /data/*.json so changes survive
 * a process restart while running the app off the in-memory mockDb.
 *
 * In APP_MODE=production: NO-OP. The filesystem is read-only on Vercel,
 * and the SQL adapter is the source of truth — there is nothing to mirror.
 */

import fs from 'node:fs';
import path from 'node:path';

export function isProduction() {
  return (process.env.APP_MODE || 'local').toLowerCase() === 'production';
}

/**
 * Best-effort write of a JSON payload into /data/<filename>.
 * Silently no-ops in production. Errors only warn — never throw — because
 * losing the disk mirror is recoverable but losing the API response is not.
 */
export function persistJsonSync(filename, payload) {
  if (isProduction()) return false;
  try {
    const file = path.join(process.cwd(), 'data', filename);
    fs.writeFileSync(file, JSON.stringify(payload, null, 2));
    return true;
  } catch (e) {
    console.warn(`[persistJson] write to ${filename} failed:`, e.message);
    return false;
  }
}
