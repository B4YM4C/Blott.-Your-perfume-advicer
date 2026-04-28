import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mergeWithDefaults, loadDefaults } from '@/lib/copy';
import { persistJsonSync } from '@/lib/persistJson';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/copy
 *   Returns the merged copy object (defaults + DB override) so the editor
 *   shows a populated form on first load. Defaults are also returned in
 *   case the editor wants a "reset to default" button per field later.
 */
export async function GET() {
  const override = await db.getCopy();
  const defaults = loadDefaults();
  const merged = mergeWithDefaults(override);
  return NextResponse.json({ ok: true, copy: merged, defaults });
}

/**
 * PUT /api/admin/copy
 *   Body: the entire merged copy object (admin editor sends the whole
 *   thing on save). Stored as the override row — public reads merge it
 *   on top of /data/copy.json.
 */
export async function PUT(req) {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'body must be an object' }, { status: 400 });
    }
    const next = await db.setCopy(body);
    persistJsonSync('copy.json', { _note: 'Edited via /admin/copy', ...next });
    return NextResponse.json({ ok: true, copy: next });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
