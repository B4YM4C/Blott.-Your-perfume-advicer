import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req) {
  try {
    const body = await req.json();
    const { sessionId, consent } = body;
    if (!['accepted', 'rejected', 'withdrawn'].includes(consent)) {
      return NextResponse.json({ ok: false, error: 'invalid consent value' }, { status: 400 });
    }
    await db.logConsent({ sessionId: sessionId || null, consent });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
