import ParamsEditor from './ParamsEditor';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ParamsPage() {
  const params = await db.getParams();
  return <ParamsEditor initial={params} />;
}
