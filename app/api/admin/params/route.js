import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { persistJsonSync } from '@/lib/persistJson';

export const dynamic = 'force-dynamic';

export async function GET() {
  const params = await db.getParams();
  return NextResponse.json({ ok: true, params });
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const next = await db.setParams(body);
    persistJsonSync('params.json', { _note: 'Edited via /admin/params — see lib/quizLogic.js for usage.', ...next });
    return NextResponse.json({ ok: true, params: next });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
