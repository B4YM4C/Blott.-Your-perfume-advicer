import { db } from '@/lib/db';
import PerfumeEditor from './PerfumeEditor';

export const dynamic = 'force-dynamic';

export default async function EditPerfumePage({ params }) {
  const { id } = params;
  let perfume = null;
  if (id !== 'new') perfume = await db.getPerfume(id);

  if (!perfume) {
    perfume = {
      id: id === 'new' ? null : id,
      fragrance: '',
      house: '',
      family: '',
      notes: [],
      blurb: '',
      image: null,
      dna: {},
    };
  }

  const paramConfig = await db.getParams();
  return <PerfumeEditor initial={perfume} isNew={id === 'new'} paramConfig={paramConfig} />;
}
