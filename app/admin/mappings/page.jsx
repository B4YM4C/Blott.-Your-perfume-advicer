import { db } from '@/lib/db';
import MappingsEditor from './MappingsEditor';

export const dynamic = 'force-dynamic';

export default async function MappingsPage() {
  const mappings = await db.listMappings();
  return <MappingsEditor initial={mappings} />;
}
