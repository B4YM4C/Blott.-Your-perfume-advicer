import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { persistJsonSync } from '@/lib/persistJson';

export const dynamic = 'force-dynamic';

async function persistAll() {
  const perfumes = await db.listPerfumes();
  persistJsonSync('perfumes.json', { _note: 'Edited via /admin/perfumes', perfumes });
}

export async function GET(_req, { params }) {
  const p = await db.getPerfume(params.id);
  if (!p) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, perfume: p });
}

export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    body.id = params.id;
    const saved = await db.upsertPerfume(body);
    await persistAll();
    return NextResponse.json({ ok: true, perfume: saved });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const ok = await db.deletePerfume(params.id);
    await persistAll();
    return NextResponse.json({ ok });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
