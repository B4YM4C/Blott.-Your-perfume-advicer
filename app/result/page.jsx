import ResultClient from './ResultClient';
import { db } from '../../lib/db';
import { mergeWithDefaults } from '../../lib/copy';
import { cookies } from 'next/headers';
import { localeFromCookies, localizeCopy } from '../../lib/i18n';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your Match · Blot.' };

export default async function ResultPage({ searchParams }) {
  const sid = searchParams?.sid || '';
  const override = await db.getCopy().catch(() => ({}));
  const copy = localizeCopy(mergeWithDefaults(override), localeFromCookies(cookies()));
  return <ResultClient sessionId={sid} copy={copy.result || {}} />;
}
