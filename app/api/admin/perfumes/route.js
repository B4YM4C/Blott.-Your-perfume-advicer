import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { persistJsonSync } from '@/lib/persistJson';

export const dynamic = 'force-dynamic';

async function persistAll() {
  const perfumes = await db.listPerfumes();
  persistJsonSync('perfumes.json', { _note: 'Edited via /admin/perfumes', perfumes });
}

export async function GET() {
  const perfumes = await db.listPerfumes();
  return NextResponse.json({ ok: true, perfumes });
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.id) {
      const slug = (body.fragrance || 'perfume')
        .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32);
      body.id = `p_${slug || 'item'}_${Math.random().toString(36).slice(2, 6)}`;
    }
    const saved = await db.upsertPerfume(body);
    await persistAll();
    return NextResponse.json({ ok: true, perfume: saved });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
