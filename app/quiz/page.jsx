import QuizClient from './QuizClient';
import { db } from '@/lib/db';
import { mergeWithDefaults } from '@/lib/copy';

export const metadata = { title: 'Quiz · Blot.' };
export const dynamic = 'force-dynamic';

async function getQuestions() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  // Fall back to direct DB read on the server to avoid network during SSR
  try {
    const { db } = await import('@/lib/db');
    return db.listQuestions();
  } catch (_) {
    const r = await fetch(`${base}/api/quiz/questions`, { cache: 'no-store' });
    const d = await r.json();
    return d.questions || [];
  }
}

export default async function QuizPage() {
  const [questions, override] = await Promise.all([
    getQuestions(),
    db.getCopy().catch(() => ({})),
  ]);
  const copy = mergeWithDefaults(override);
  return <QuizClient questions={questions} copy={copy} />;
}
