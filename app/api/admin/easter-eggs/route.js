import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { persistJsonSync } from '@/lib/persistJson';

export const dynamic = 'force-dynamic';

async function persistAll() {
  const rules = await db.listEasterEggs();
  persistJsonSync('easterEggs.json', { _note: 'Edited via /admin/easter-eggs', rules });
}

export async function GET() {
  const rules = await db.listEasterEggs();
  return NextResponse.json({ ok: true, rules });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const saved = await db.upsertEasterEgg(body);
    await persistAll();
    return NextResponse.json({ ok: true, rule: saved });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
