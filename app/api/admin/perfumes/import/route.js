import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { persistJsonSync } from '@/lib/persistJson';
import { parsePerfumesCsv } from '@/lib/perfumeCsv';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/perfumes/import
 *
 * Body: raw CSV text (Content-Type: text/csv) — produced by the matching
 * /export endpoint, or hand-edited in Excel / Google Sheets.
 *
 * Modes (?mode=upsert | replace, default upsert):
 *   - upsert: existing perfumes (matched by id) are updated; rows with new
 *     ids are appended. Rows missing an id are auto-slugged from the name.
 *   - replace: same as upsert but FIRST deletes any perfume whose id is not
 *     in the upload — i.e. the CSV becomes the complete library.
 *
 * Response:
 *   { ok, added, updated, deleted, skipped, errors:[{line,message}] }
 *
 * The route is forgiving: malformed rows produce per-row errors but never
 * abort the whole import. Use the response payload to surface a friendly
 * report in the admin UI.
 */
export async function POST(req) {
  try {
    const url = new URL(req.url);
    const mode = (url.searchParams.get('mode') || 'upsert').toLowerCase();
    if (!['upsert', 'replace'].includes(mode)) {
      return NextResponse.json({ ok: false, error: `Unknown mode "${mode}"` }, { status: 400 });
    }

    const text = await req.text();
    if (!text.trim()) {
      return NextResponse.json({ ok: false, error: 'Empty body — no CSV uploaded' }, { status: 400 });
    }

    const params = await db.getParams();
    const { rows, errors } = parsePerfumesCsv(text, params);
    if (rows.length === 0) {
      return NextResponse.json({
        ok: false,
        error: 'No rows parsed from CSV — check the header line',
        errors,
      }, { status: 400 });
    }

    // Index existing library so we can tell added vs updated.
    const existing = await db.listPerfumes();
    const existingIds = new Set(existing.map((p) => p.id));

    let added = 0;
    let updated = 0;
    for (const r of rows) {
      try {
        if (existingIds.has(r.id)) updated++;
        else                       added++;
        await db.upsertPerfume(r);
      } catch (e) {
        errors.push({ line: -1, message: `${r.id || r.fragrance}: ${e.message}` });
      }
    }

    let deleted = 0;
    if (mode === 'replace') {
      const importedIds = new Set(rows.map((r) => r.id));
      for (const p of existing) {
        if (!importedIds.has(p.id)) {
          try { await db.deletePerfume(p.id); deleted++; }
          catch (e) { errors.push({ line: -1, message: `delete ${p.id}: ${e.message}` }); }
        }
      }
    }

    // Mirror to /data/perfumes.json so dev/local can survive a process restart.
    try {
      const fresh = await db.listPerfumes();
      persistJsonSync('perfumes.json', { _note: 'Edited via /admin/perfumes', perfumes: fresh });
    } catch (e) {
      errors.push({ line: -1, message: `persist mirror failed: ${e.message}` });
    }

    return NextResponse.json({
      ok: true,
      mode,
      added,
      updated,
      deleted,
      skipped: errors.filter((e) => e.line > 0).length,
      total: rows.length,
      errors,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
