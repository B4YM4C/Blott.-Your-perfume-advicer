import Link from 'next/link';
import { db } from '@/lib/db';
import { ui } from '../_ui';

export const dynamic = 'force-dynamic';

export default async function EasterEggsList() {
  const rules = await db.listEasterEggs();
  const questions = await db.listQuestions();

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <span className="meta">Rules</span>
          <h1 style={ui.h1}>Easter Eggs</h1>
          <p style={{ color: 'var(--grey-2)', marginTop: 4, fontSize: 14, maxWidth: 720 }}>
            ตั้ง rule ให้ระบบส่งผลลัพธ์พิเศษเมื่อผู้ใช้ตอบครบเงื่อนไข — เลือก choice แต่ละข้อจาก dropdown,
            ปล่อยว่างไว้ = wildcard (ตอบอะไรก็ผ่าน)
          </p>
        </div>
        <Link href="/admin/easter-eggs/new" className="btn">+ Add easter egg</Link>
      </header>

      <div style={table}>
        <div style={{ ...row, ...rowHead }}>
          <div>On/Off</div>
          <div>Label</div>
          <div>Type</div>
          <div>Constraints</div>
          <div>Result</div>
          <div></div>
        </div>
        {rules.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--grey-3)' }}>
            ยังไม่มี easter egg — กด <em>+ Add easter egg</em> เพื่อสร้าง rule แรก
          </div>
        )}
        {rules.map((r) => (
          <div key={r.id} style={row}>
            <div>
              <span style={{ ...badge, background: r.enabled === false ? 'var(--grey-5)' : 'var(--ink)', color: r.enabled === false ? 'var(--grey-2)' : 'var(--paper)' }}>
                {r.enabled === false ? 'OFF' : 'ON'}
              </span>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17 }}>{r.label || r.id}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-3)', marginTop: 2 }}>
                priority {r.priority || 0}
              </div>
            </div>
            <div>
              <span style={chip}>{r.type === 'puzzle' ? 'Puzzle' : 'Quiz'}</span>
            </div>
            <div style={{ fontSize: 12 }}>
              {r.type === 'puzzle' ? (
                <div>
                  {(r.constraints?.triggers || []).slice(0, 4).map((t) => <div key={t}><span style={chip}>{t}</span></div>)}
                </div>
              ) : Object.entries(r.constraints || {}).map(([qid, code]) => {
                const q = questions.find((q) => q.id === qid);
                if (!code) return null;
                const choice = q?.choices.find((c) => c.code === code);
                return (
                  <div key={qid} style={{ marginBottom: 2 }}>
                    <span style={chip}>{q?.order ? `Q${q.order}` : qid}</span>
                    <span style={{ color: 'var(--grey-2)' }}> = {code} · {choice?.label || '?'}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey-2)' }}>{r.result?.fragrance || '—'}</div>
            <div style={{ textAlign: 'right' }}>
              <Link href={`/admin/easter-eggs/${r.id}`} style={editLink}>Edit →</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const table = {
  background: 'var(--paper)', border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-soft)', overflow: 'hidden',
};
const row = {
  display: 'grid', gridTemplateColumns: '60px 1.4fr 90px 2fr 1.5fr 80px',
  gap: 16, padding: '16px 22px', borderBottom: '1px solid var(--grey-5)', alignItems: 'center',
};
const rowHead = {
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.2em',
  textTransform: 'uppercase', color: 'var(--grey-3)', background: 'var(--offwhite)',
};
const chip = {
  display: 'inline-block', padding: '2px 8px', border: '1px solid var(--grey-4)',
  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.15em',
  textTransform: 'uppercase', borderRadius: 999, marginRight: 6,
};
const badge = {
  display: 'inline-block', padding: '4px 10px', borderRadius: 999,
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.2em',
};
const editLink = {
  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase',
};
