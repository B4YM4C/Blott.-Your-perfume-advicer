import { db } from '@/lib/db';
import { mergeWithDefaults } from '@/lib/copy';
import { cookies } from 'next/headers';
import { localeFromCookies, localizeCopy } from '@/lib/i18n';
import HomeClient from './HomeClient';

// Re-fetch copy on every request so admin edits show up without a redeploy.
// This is cheap — one indexed PK lookup on a single-row table.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const override = await db.getCopy().catch(() => ({}));
  const copy = localizeCopy(mergeWithDefaults(override), localeFromCookies(cookies()));
  return <HomeClient copy={copy} />;
}
