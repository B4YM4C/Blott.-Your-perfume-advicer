import { db } from '@/lib/db';
import { mergeWithDefaults, loadDefaults } from '@/lib/copy';
import SiteEditor from './SiteEditor';

export const dynamic = 'force-dynamic';

export default async function SiteEditorPage() {
  const override = await db.getCopy().catch(() => ({}));
  const merged   = mergeWithDefaults(override);
  const defaults = loadDefaults();
  return <SiteEditor initial={merged} defaults={defaults} />;
}
