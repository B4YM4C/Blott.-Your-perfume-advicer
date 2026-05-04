import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { localeFromCookies, localizeQuestion } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const locale = localeFromCookies(cookies());
    const questions = (await db.listQuestions()).map((q) => localizeQuestion(q, locale));
    return NextResponse.json({ ok: true, questions });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
