import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ui } from '../../_ui';

export const dynamic = 'force-dynamic';

export default async function SessionDetail({ params }) {
  const { id } = params;
  const detail = await db.getSessionDetail(id);
  if (!detail) notFound();

  const questions = await db.listQuestions();
  const questionMap = new Map(questions.map((qq) => [qq.id, qq]));

  const { session, user, answers, result } = detail;

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <span className="meta">Session</span>
          <h1 style={{ ...ui.h1, fontSize: 30 }}>{user.username || 'Anonymous'}</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-3)', marginTop: 6 }}>{session.id}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/admin/sessions" className="btn ghost">← All sessions</Link>
        </div>
      </header>

      <div style={metaGrid}>
        <Meta label="Started"   value={fmtFull(session.startedAt)} />
        <Meta label="Completed" value={fmtFull(session.completedAt)} />
        <Meta label="Duration"  value={fmtDuration(session.durationMs)} />
        <Meta label="Email"     value={user.email || '— not provided'} />
      </div>

      {result && (
        <section style={{ ...ui.panel, marginTop: 28 }}>
          <h2 style={h2}>
            Result
            {result.special && <span style={specialPill}>easter egg</span>}
          </h2>
          <div style={resultGrid}>
            <div>
              {result.image
                ? <img src={result.image} alt="" style={{ width: '100%', maxWidth: 220, borderRadius: 8, border: '1px solid var(--grey-5)' }} />
                : <div style={emptyImg}>no image</div>}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28 }}>{result.fragrance || '—'}</div>
              <div style={{ color: 'var(--grey-2)', marginTop: 4 }}>
                {[result.house, result.family].filter(Boolean).join(' · ')}
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {result.pattern && <Badge>{`pattern: ${result.pattern}`}</Badge>}
                {result.distance != null && <Badge>{`distance: ${Number(result.distance).toFixed(2)}`}</Badge>}
                {result.ruleId && <Badge>{`rule: ${result.ruleId}`}</Badge>}
                {result.perfumeId && <Badge>{`id: ${result.perfumeId}`}</Badge>}
              </div>
              {result.blurb && (
                <p style={{ marginTop: 14, color: 'var(--grey-1)', fontSize: 14, lineHeight: 1.6 }}>{result.blurb}</p>
              )}
              {(result.notes || []).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {result.notes.map((n, i) => <span key={i} style={chip}>{n}</span>)}
                </div>
              )}
            </div>
          </div>

          {result.vector && (
            <div style={{ marginTop: 24 }}>
              <div style={subhead}>User vector</div>
              <VectorBars vector={result.vector} />
            </div>
          )}

          {Array.isArray(result.reasons) && result.reasons.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={subhead}>Why this match</div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: 'var(--grey-1)' }}>
                {result.reasons.map((r, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {typeof r === 'string'
                      ? r
                      : `${r.axis || r.name || ''}: user ${fmtNum(r.user)} vs perfume ${fmtNum(r.perfume)} (Δ ${fmtNum(r.delta)})`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(result.alternatives) && result.alternatives.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={subhead}>Runners-up</div>
              <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                {result.alternatives.map((alt, i) => (
                  <div key={i} style={altCard}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16 }}>{alt.fragrance}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey-3)', marginTop: 2 }}>
                      {[alt.house, alt.family].filter(Boolean).join(' · ')}
                    </div>
                    {alt.distance != null && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-2)', marginTop: 6 }}>
                        distance {Number(alt.distance).toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section style={{ ...ui.panel, marginTop: 28 }}>
        <h2 style={h2}>Answers ({answers.length})</h2>
        {answers.length === 0 && <p style={{ color: 'var(--grey-3)' }}>No answers recorded.</p>}
        {answers.map((a) => {
          const qq = questionMap.get(a.questionId);
          const choices = Array.isArray(a.choiceCode) ? a.choiceCode : String(a.choiceCode || '').split(/[,]/).filter(Boolean);
          return (
            <div key={a.questionId} style={answerRow}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-3)' }}>
                Q{a.questionOrder}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16 }}>
                  {qq?.title || a.questionId}
                </div>
                {qq?.subtitle && (
                  <div style={{ color: 'var(--grey-3)', fontSize: 12, marginTop: 2 }}>{qq.subtitle}</div>
                )}
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {choices.map((code, i) => {
                    const opt = qq?.choices?.find((c) => c.code === code);
                    return (
                      <span key={i} style={answerChip}>
                        <strong style={{ marginRight: 6, fontFamily: 'var(--font-mono)', fontSize: 10 }}>{code}</strong>
                        {opt?.label || code}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function VectorBars({ vector }) {
  const entries = Object.entries(vector);
  if (entries.length === 0) return null;
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {entries.map(([axis, value]) => {
        const v = Number(value) || 0;
        // Map -10..+10 to 0..100% with 50% as the midpoint
        const pct = Math.max(0, Math.min(100, ((v + 10) / 20) * 100));
        const positive = v >= 0;
        return (
          <div key={axis} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 50px', alignItems: 'center', gap: 10 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-2)' }}>{axis}</div>
            <div style={barTrack}>
              <div style={barCenter} />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: positive ? '50%' : `${pct}%`,
                  width: positive ? `${pct - 50}%` : `${50 - pct}%`,
                  background: 'var(--ink)',
                }}
              />
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textAlign: 'right' }}>
              {fmtNum(v)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div style={metaCard}>
      <div className="meta">{label}</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, marginTop: 6 }}>{value}</div>
    </div>
  );
}
function Badge({ children }) {
  return (
    <span style={{ ...ui.badge, color: 'var(--grey-1)' }}>{children}</span>
  );
}

function fmtFull(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
function fmtNum(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  return (v >= 0 ? '+' : '') + v.toFixed(2);
}

const h2 = { fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, marginBottom: 16, display: 'flex', alignItems: 'center' };
const subhead = { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--grey-3)', marginBottom: 10 };
const metaGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 };
const metaCard = {
  background: 'var(--paper)', border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-sm)', padding: '14px 18px',
};
const resultGrid = { display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' };
const emptyImg = {
  width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--offwhite)', border: '1px dashed var(--grey-4)', borderRadius: 8,
  color: 'var(--grey-3)', fontSize: 12,
};
const chip = {
  display: 'inline-block', padding: '2px 8px', border: '1px solid var(--grey-4)',
  marginRight: 4, marginBottom: 4, fontFamily: 'var(--font-mono)', fontSize: 9,
  borderRadius: 999,
};
const answerRow = {
  display: 'grid', gridTemplateColumns: '60px 1fr', gap: 16,
  padding: '14px 0', borderTop: '1px solid var(--grey-5)', alignItems: 'flex-start',
};
const answerChip = {
  display: 'inline-flex', alignItems: 'center',
  padding: '4px 10px', background: 'var(--offwhite)',
  border: '1px solid var(--grey-5)', borderRadius: 999,
  fontSize: 12, color: 'var(--grey-1)',
};
const altCard = {
  background: 'var(--offwhite)', border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-sm)', padding: '12px 14px',
};
const specialPill = {
  display: 'inline-block', marginLeft: 12, padding: '1px 10px',
  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.18em',
  textTransform: 'uppercase', background: 'var(--ink)', color: 'var(--paper)',
  borderRadius: 999,
};
const barTrack = {
  position: 'relative', height: 18, background: 'var(--offwhite)',
  border: '1px solid var(--grey-5)', borderRadius: 4, overflow: 'hidden',
};
const barCenter = {
  position: 'absolute', top: 0, bottom: 0, left: '50%',
  width: 1, background: 'var(--grey-4)',
};
