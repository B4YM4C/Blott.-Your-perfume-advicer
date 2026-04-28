import Link from 'next/link';
import { db } from '@/lib/db';
import { ui } from '../_ui';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export default async function SessionsList({ searchParams }) {
  const page = Math.max(1, Number(searchParams?.page || 1));
  const offset = (page - 1) * PAGE_SIZE;

  const rows = await db.listCompletedSessions({ limit: PAGE_SIZE, offset });
  const summary = await db.dashboardSummary();
  const total = summary.completedTotal;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <span className="meta">Quiz log</span>
          <h1 style={ui.h1}>Sessions</h1>
          <p style={{ color: 'var(--grey-2)', marginTop: 4, fontSize: 14 }}>
            {total.toLocaleString()} ครั้งที่ทำแบบสอบถามจนจบ — เก็บเฉพาะคนที่ทำเสร็จ
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/admin" className="btn ghost">← Dashboard</Link>
        </div>
      </header>

      <div style={table}>
        <div style={{ ...row, ...rowHead }}>
          <div>When</div>
          <div>User</div>
          <div>Result</div>
          <div>Pattern</div>
          <div>Distance</div>
          <div>Duration</div>
          <div></div>
        </div>
        {rows.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--grey-3)' }}>
            ยังไม่มีคนทำแบบสอบถามจนจบ
          </div>
        )}
        {rows.map((s) => (
          <div key={s.id} style={row}>
            <div style={cellTime}>
              <div>{fmtDate(s.completedAt)}</div>
              <div style={{ color: 'var(--grey-3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                {fmtTime(s.completedAt)}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16 }}>{s.username || 'Anonymous'}</div>
              <div style={{ fontSize: 11, color: 'var(--grey-3)', fontFamily: 'var(--font-mono)' }}>
                {s.email || '— no email'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14 }}>
                {s.fragrance || <em style={{ color: 'var(--grey-3)' }}>—</em>}
                {s.special && <span style={specialPill}>egg</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--grey-3)' }}>
                {[s.house, s.family].filter(Boolean).join(' · ') || ''}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-2)' }}>
              {s.pattern || '—'}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {s.distance == null ? '—' : s.distance.toFixed(2)}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-2)' }}>
              {fmtDuration(s.durationMs)}
            </div>
            <div style={{ textAlign: 'right' }}>
              <Link href={`/admin/sessions/${s.id}`} style={editLink}>View →</Link>
            </div>
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div style={pager}>
          {page > 1 && <Link href={`/admin/sessions?page=${page - 1}`} className="btn ghost">← Prev</Link>}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-2)' }}>
            Page {page} of {pages}
          </span>
          {page < pages && <Link href={`/admin/sessions?page=${page + 1}`} className="btn ghost">Next →</Link>}
        </div>
      )}
    </div>
  );
}

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function fmtDuration(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

const table = {
  background: 'var(--paper)', border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-soft)', overflow: 'hidden',
};
const row = {
  display: 'grid', gridTemplateColumns: '110px 1.6fr 2fr 1fr 90px 90px 80px',
  gap: 14, padding: '14px 22px', borderBottom: '1px solid var(--grey-5)', alignItems: 'center',
};
const rowHead = {
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.2em',
  textTransform: 'uppercase', color: 'var(--grey-3)', background: 'var(--offwhite)',
};
const cellTime = { fontSize: 12, color: 'var(--grey-2)' };
const specialPill = {
  display: 'inline-block', marginLeft: 8, padding: '1px 8px',
  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.18em',
  textTransform: 'uppercase', background: 'var(--ink)', color: 'var(--paper)',
  borderRadius: 999,
};
const editLink = {
  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase',
};
const pager = { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 };
