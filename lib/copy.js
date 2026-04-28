/**
 * Site copy helpers — defaults loader + deep merge.
 *
 * Public pages call `getCopy()` (server-side) which reads /data/copy.json
 * for defaults and merges any DB overrides on top. The resulting object is
 * shaped exactly like /data/copy.json and is safe to spread into props.
 *
 * Admin /copy page uses `setCopy(next)` to persist the entire merged object
 * — keep mutations going through the editor so we get a single source of
 * truth in the DB.
 */

import fs from 'node:fs';
import path from 'node:path';

let _defaults = null;

export function loadDefaults() {
  if (_defaults) return _defaults;
  try {
    const file = path.join(process.cwd(), 'data', 'copy.json');
    const raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
    delete raw._note; // strip dev-only commentary
    _defaults = raw;
  } catch (e) {
    console.warn('[copy] defaults load failed:', e.message);
    _defaults = {};
  }
  return _defaults;
}

/** Deep-merge `b` over `a` for plain objects. Arrays in `b` REPLACE arrays
 *  in `a` (so the editor can shorten a list cleanly). Primitives in `b`
 *  override. Null/undefined in `b` falls back to `a`. */
export function deepMerge(a, b) {
  if (b == null) return a;
  if (a == null) return b;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(b) ? b : a;
  }
  if (typeof a !== 'object' || typeof b !== 'object') return b;
  const out = { ...a };
  for (const k of Object.keys(b)) {
    out[k] = deepMerge(a[k], b[k]);
  }
  return out;
}

export function mergeWithDefaults(overrides) {
  return deepMerge(loadDefaults(), overrides || {});
}
