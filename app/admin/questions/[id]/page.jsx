import { db } from '@/lib/db';
import QuestionEditor from './QuestionEditor';

export const dynamic = 'force-dynamic';

export default async function EditQuestionPage({ params }) {
  const { id } = params;
  let question = null;
  if (id !== 'new') question = await db.getQuestion(id);

  if (!question) {
    question = {
      id: id === 'new' ? null : id,
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
  }

  const paramConfig = await db.getParams();
  return <QuestionEditor initial={question} isNew={id === 'new'} paramConfig={paramConfig} />;
}
