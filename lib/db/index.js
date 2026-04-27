/**
 * DB provider — switches between mock (local) and SQL (production)
 * based on APP_MODE.
 *
 * Both adapters expose the SAME async interface so callers don't care.
 *
 *   import { db } from '@/lib/db';
 *   const questions = await db.listQuestions();
 */

import { mockDb } from './mockDb';

let _impl = null;

async function getImpl() {
  if (_impl) return _impl;
  const mode = (process.env.APP_MODE || 'local').toLowerCase();
  if (mode === 'production') {
    const { sqlDb } = await import('./sqlDb');
    _impl = sqlDb;
  } else {
    _impl = mockDb;
  }
  return _impl;
}

// Lazy proxy — defers to whichever implementation is configured.
export const db = new Proxy({}, {
  get(_t, prop) {
    return async (...args) => {
      const impl = await getImpl();
      const fn = impl[prop];
      if (typeof fn !== 'function') throw new Error(`db.${String(prop)} is not implemented`);
      return fn.apply(impl, args);
    };
  },
});

export function dbMode() { return (process.env.APP_MODE || 'local').toLowerCase(); }
