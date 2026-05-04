import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, localeFromCookies, localizeResult } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

function toPublicResult(result) {
  const { pattern, ...publicResult } = result;
  return publicResult;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ ok: false, error: 'sessionId required' }, { status: 400 });
  const result = await db.getResult(sessionId);
  if (!result) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  const locale = localeFromCookies(cookies());
  if (locale === DEFAULT_LOCALE) {
    return NextResponse.json({ ok: true, result: toPublicResult(result) });
  }
  const perfumes = await db.listPerfumes().catch(() => []);
  const perfumeMap = new Map(perfumes.map((p) => [p.id, p]));
  return NextResponse.json({ ok: true, result: toPublicResult(localizeResult(result, locale, perfumeMap)) });
}
