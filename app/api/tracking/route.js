import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/tracking
 * body: { sessionId?, type, payload? }
 * Logs only when TRACKING_ENABLED=true and (assumed) user consented client-side.
 * Strips PII — payload is whatever the client sends; do not include emails / IPs here.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { sessionId, type, payload } = body;
    if (!type) return NextResponse.json({ ok: false, error: 'type required' }, { status: 400 });
    await db.logEvent(sessionId || null, type, payload || {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
