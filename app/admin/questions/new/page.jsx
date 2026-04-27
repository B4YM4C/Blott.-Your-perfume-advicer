import QuestionEditor from '../[id]/QuestionEditor';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function NewQuestionPage() {
  const blank = {
    id: null,
    order: 1,
    title: '',
    subtitle: '',
    image: null,
    multiSelect: false,
    choices: [
      { code: 'A', label: '', image: null, scores: {} },
      { code: 'B', label: '', image: null, scores: {} },
      { code: 'C', label: '', image: null, scores: {} },
      { code: 'D', label: '', image: null, scores: {} },
    ],
  };
  const paramConfig = await db.getParams();
  return <QuestionEditor initial={blank} isNew={true} paramConfig={paramConfig} />;
}
