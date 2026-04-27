import { NextResponse } from 'next/server';

/**
 * POST /api/email
 * body: { to, subject, fragrance, blurb, sessionId }
 *
 * Beta-stub: just logs. In production, swap in your provider:
 *   - SendGrid, Resend, SES, Postmark, etc.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const provider = process.env.EMAIL_PROVIDER || 'stub';
    if (provider === 'stub') {
      console.log('[email:stub]', JSON.stringify(body));
      return NextResponse.json({ ok: true, sent: false, reason: 'stub provider' });
    }

    // TODO: integrate real provider
    return NextResponse.json({ ok: true, sent: false, reason: `provider "${provider}" not wired yet` });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
