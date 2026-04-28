import Link from 'next/link';
import { db, dbMode } from '@/lib/db';
import { ui } from './_ui';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  // Pull everything in parallel — these are all small queries.
  const [summary, recent, questions, perfumes, eggs] = await Promise.all([
    db.dashboardSummary(),
    db.listCompletedSessions({ limit: 10, offset: 0 }),
    db.listQuestions(),
    db.listPerfumes(),
    db.listEasterEggs(),
  ]);

  return (
    <div>
      <header style={{ marginBottom: 28 }}>
        <span className="meta">Dashboard</span>
        <h1 style={ui.h1}>Overview</h1>
        <p style={{ color: 'var(--grey-2)', marginTop: 8, fontSize: 14 }}>
          Mode: <strong>{dbMode()}</strong>{' '}
          {dbMode() === 'local'
            ? '· in-memory mock (no persistence)'
            : '· Postgres / Neon — counts include only completed quizzes'}
        </p>
      </header>

      {/* Hero strip — the four numbers admins actually care about */}
      <div style={heroGrid}>
        <Hero label="Completed today"  value={summary.completedToday}  hint="last 24 hours" />
        <Hero label="This week"        value={summary.completedWeek}   hint="last 7 days" />
        <Hero label="All-time"         value={summary.completedTotal}  hint="lifetime completions" />
        <Hero label="Easter eggs hit"  value={summary.specialHits}     hint={`${eggs.filter(e => e.enabled).length} rules active`} />
      </div>

      {/* Library snapshot + behaviour */}
      <div style={statRow}>
        <Stat label="Questions live" value={questions.length} />
        <Stat label="Perfumes in library" value={perfumes.length} />
        <Stat label="Email submission rate" value={`${summary.emailRate}%`} />
        <Stat label="Avg match distance" value={summary.avgDistance == null ? '—' : summary.avgDistance.toFixed(2)} />
      </div>

      {/* Top fragrances */}
      <section style={{ ...ui.panel, marginTop: 28 }}>
        <h2 style={h2}>Top fragrance results</h2>
        {summary.topFragrances.length === 0 ? (
          <p style={{ color: 'var(--grey-3)' }}>ยังไม่มีผลลัพธ์ — ลองทำ quiz หนึ่งรอบเพื่อเริ่มเก็บข้อมูล</p>
        ) : (
          <div>
            {summary.topFragrances.map((f, i) => {
              const max = summary.topFragrances[0].count;
              const pct = max ? Math.round((f.count / max) * 100) : 0;
              return (
                <div key={f.fragrance} style={topRow}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-3)', width: 28 }}>
                    #{i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16 }}>{f.fragrance}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--grey-2)' }}>
                        {f.count}
                      </div>
                    </div>
                    <div style={barTrack}>
                      <div style={{ ...barFill, width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent sessions — clicks through to detail */}
      <section style={{ ...ui.panel, marginTop: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <h2 style={{ ...h2, marginBottom: 0 }}>Recent completions</h2>
          <Link href="/admin/sessions" style={moreLink}>View all →</Link>
        </div>
        {recent.length === 0 ? (
          <p style={{ color: 'var(--grey-3)' }}>ยังไม่มีคนทำแบบสอบถามจนจบ</p>
        ) : (
          <div>
            <div style={{ ...recentRow, ...recentHead }}>
              <div>When</div>
              <div>User</div>
              <div>Result</div>
              <div>Distance</div>
              <div></div>
            </div>
            {recent.map((s) => (
              <div key={s.id} style={recentRow}>
                <div style={{ fontSize: 12, color: 'var(--grey-2)' }}>
                  {fmtRel(s.completedAt)}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15 }}>{s.username}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-3)' }}>
                    {s.email || '— no email'}
                  </div>
                </div>
                <div style={{ fontSize: 14 }}>
                  {s.fragrance || <em style={{ color: 'var(--grey-3)' }}>—</em>}
                  {s.special && <span style={specialPill}>egg</span>}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {s.distance == null ? '—' : Number(s.distance).toFixed(2)}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Link href={`/admin/sessions/${s.id}`} style={moreLink}>View →</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, marginBottom: 12 }}>Quick actions</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn" href="/admin/sessions">Browse sessions</Link>
          <Link className="btn ghost" href="/admin/questions">Edit questions</Link>
          <Link className="btn ghost" href="/admin/perfumes">Manage perfumes</Link>
          <Link className="btn ghost" href="/admin/easter-eggs">Easter eggs</Link>
          <a className="btn ghost" href="/" target="_blank" rel="noopener">Open public site ↗</a>
        </div>
      </section>
    </div>
  );
}

function Hero({ label, value, hint }) {
  return (
    <div style={heroBox}>
      <div className="meta">{label}</div>
      <div style={heroValue}>{value}</div>
      {hint && <div style={{ color: 'var(--grey-3)', fontSize: 12, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
function Stat({ label, value }) {
  return (
    <div style={statBox}>
      <div className="meta">{label}</div>
      <div style={statValue}>{value}</div>
    </div>
  );
}

function fmtRel(ts) {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

const heroGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 14,
};
const heroBox = {
  background: 'var(--paper)',
  padding: '24px 22px',
  border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-soft)',
};
const heroValue = { fontFamily: 'var(--font-serif)', fontSize: 44, marginTop: 8, lineHeight: 1 };

const statRow = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
  marginTop: 14,
};
const statBox = {
  background: 'var(--offwhite)',
  padding: '16px 18px',
  border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-sm)',
};
const statValue = { fontFamily: 'var(--font-serif)', fontSize: 26, marginTop: 6, lineHeight: 1 };

const h2 = { fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, marginBottom: 16 };

const topRow = { display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderTop: '1px solid var(--grey-5)' };
const barTrack = { width: '100%', height: 8, background: 'var(--offwhite)', border: '1px solid var(--grey-5)', borderRadius: 4, overflow: 'hidden' };
const barFill = { height: '100%', background: 'var(--ink)' };

const recentRow = { display: 'grid', gridTemplateColumns: '110px 1.4fr 2fr 90px 80px', gap: 14, padding: '12px 0', borderTop: '1px solid var(--grey-5)', alignItems: 'center' };
const recentHead = { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--grey-3)', borderTop: 'none', paddingTop: 0 };
const moreLink = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--ink)' };
const specialPill = {
  display: 'inline-block', marginLeft: 8, padding: '1px 8px',
  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.18em',
  textTransform: 'uppercase', background: 'var(--ink)', color: 'var(--paper)',
  borderRadius: 999,
};
