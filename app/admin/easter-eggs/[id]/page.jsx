import { db } from '@/lib/db';
import EggEditor from './EggEditor';

export const dynamic = 'force-dynamic';

export default async function EditEggPage({ params }) {
  const { id } = params;
  let rule = null;
  if (id !== 'new') rule = await db.getEasterEgg(id);

  if (!rule) {
    rule = {
      id: id === 'new' ? null : id,
      label: '',
      enabled: true,
      priority: 100,
      constraints: {},
      result: {
        fragrance: '',
        house: null,
        family: 'Easter Egg',
        notes: [],
        blurb: '',
        image: null,
      },
    };
  }

  const questions = await db.listQuestions();
  return <EggEditor initial={rule} isNew={id === 'new'} questions={questions} />;
}
