import QuizClient from './QuizClient';
import { db } from '@/lib/db';
import { mergeWithDefaults } from '@/lib/copy';
import { cookies } from 'next/headers';
import { localeFromCookies, localizeCopy, localizeQuestion } from '@/lib/i18n';

export const metadata = { title: 'Quiz · Blot.' };
export const dynamic = 'force-dynamic';

async function getQuestions() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  // Fall back to direct DB read on the server to avoid network during SSR
  try {
    const { db } = await import('@/lib/db');
    return await db.listQuestions();
  } catch (_) {
    const r = await fetch(`${base}/api/quiz/questions`, { cache: 'no-store' });
    const d = await r.json();
    return d.questions || [];
  }
}

export default async function QuizPage() {
  const locale = localeFromCookies(cookies());
  const [questions, override] = await Promise.all([
    getQuestions(),
    db.getCopy().catch(() => ({})),
  ]);
  const copy = localizeCopy(mergeWithDefaults(override), locale);
  return <QuizClient questions={questions.map((q) => localizeQuestion(q, locale))} copy={copy} />;
}
