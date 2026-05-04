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
    copy: {},
    i18n: {},
    multiSelect: false,
    choices: [
      { code: 'A', label: '', image: null, scores: {}, i18n: {} },
      { code: 'B', label: '', image: null, scores: {}, i18n: {} },
      { code: 'C', label: '', image: null, scores: {}, i18n: {} },
      { code: 'D', label: '', image: null, scores: {}, i18n: {} },
    ],
  };
  const paramConfig = await db.getParams();
  return <QuestionEditor initial={blank} isNew={true} paramConfig={paramConfig} />;
}
