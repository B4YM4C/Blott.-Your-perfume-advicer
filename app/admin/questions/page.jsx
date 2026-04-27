import Link from 'next/link';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function QuestionsList() {
  const questions = await db.listQuestions();

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <span className="meta">Content</span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, marginTop: 6 }}>Questions</h1>
          <p style={{ color: 'var(--grey-2)', marginTop: 4, fontSize: 14 }}>
            {questions.length} ข้อ — admin สามารถเพิ่ม / ลด / แก้ไขจำนวนข้อและ choices ได้อิสระ
          </p>
        </div>
        <Link href="/admin/questions/new" className="btn">+ Add question</Link>
      </header>

      <div style={table}>
        <div style={{ ...row, ...rowHead }}>
          <div>#</div>
          <div>Title</div>
          <div>Subtitle</div>
          <div>Choices</div>
          <div></div>
        </div>
        {questions.map((q, i) => (
          <div key={q.id} style={row}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{String(i + 1).padStart(2, '0')}</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>{q.title}</div>
            <div style={{ fontSize: 13, color: 'var(--grey-2)' }}>{q.subtitle}</div>
            <div style={{ fontSize: 13 }}>
              {q.choices.map((c) => (
                <span key={c.code} style={chip}>{c.code}</span>
              ))}
            </div>
            <div style={{ textAlign: 'right' }}>
              <Link href={`/admin/questions/${q.id}`} style={editLink}>Edit →</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const table = {
  background: 'var(--paper)',
  border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-soft)',
  overflow: 'hidden',
};
const row = {
  display: 'grid', gridTemplateColumns: '40px 2fr 1.5fr 1.5fr 80px',
  gap: 16, padding: '18px 22px', borderBottom: '1px solid var(--grey-5)', alignItems: 'center',
};
const rowHead = { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--grey-3)', background: 'var(--offwhite)' };
const chip = {
  display: 'inline-block',
  padding: '3px 10px',
  border: '1px solid var(--grey-4)',
  marginRight: 6,
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  borderRadius: 'var(--radius-pill)',
};
const editLink = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase' };
