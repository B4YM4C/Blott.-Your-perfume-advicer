import { db } from '@/lib/db';
import { mergeWithDefaults, loadDefaults } from '@/lib/copy';
import CopyEditor from './CopyEditor';

export const dynamic = 'force-dynamic';

export default async function CopyAdminPage() {
  const override = await db.getCopy();
  const defaults = loadDefaults();
  const merged = mergeWithDefaults(override);
  return <CopyEditor initial={merged} defaults={defaults} />;
}
