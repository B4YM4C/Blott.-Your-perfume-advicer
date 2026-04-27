import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const mappings = await db.listMappings();
  return NextResponse.json({ ok: true, mappings });
}

/**
 * PUT replaces the entire mappings list.
 * body: { mappings: [...] }
 */
export async function PUT(req) {
  try {
    const body = await req.json();
    const list = Array.isArray(body.mappings) ? body.mappings : [];
    // Mock-friendly: nuke existing then upsert. SQL adapter does the same via UNIQUE pattern.
    if (typeof db.replaceMappings === 'function') {
      await db.replaceMappings(list);
    } else {
      // mock fallback: remove all then re-add
      const current = await db.listMappings();
      while (current.length) { await db.deleteMapping?.(0); current.pop(); }
      for (const m of list) await db.upsertMapping(m);
    }
    return NextResponse.json({ ok: true, count: list.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
