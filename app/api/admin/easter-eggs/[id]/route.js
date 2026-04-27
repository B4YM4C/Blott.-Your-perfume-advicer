import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { persistJsonSync } from '@/lib/persistJson';

export const dynamic = 'force-dynamic';

async function persistAll() {
  const rules = await db.listEasterEggs();
  persistJsonSync('easterEggs.json', { _note: 'Edited via /admin/easter-eggs', rules });
}

export async function GET(_req, { params }) {
  const r = await db.getEasterEgg(params.id);
  if (!r) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, rule: r });
}

export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    body.id = params.id;
    const saved = await db.upsertEasterEgg(body);
    await persistAll();
    return NextResponse.json({ ok: true, rule: saved });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const ok = await db.deleteEasterEgg(params.id);
    await persistAll();
    return NextResponse.json({ ok });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
