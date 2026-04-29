'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ResultClient({ sessionId, copy = {} }) {
  // Pull editable copy keys with sensible fallbacks so a missing override
  // never produces empty UI strings.
  const c = {
    eyebrowPrefix: copy.eyebrowPrefix ?? 'Your Match · Pattern ',
    titleLine1: copy.titleLine1 ?? 'The strip points to',
    actionAgain: copy.actions?.again ?? 'Take it again',
    actionHome: copy.actions?.home ?? 'Back to home',
    altsEyebrow: copy.alternatives?.eyebrow ?? 'Also nearby',
    altsTitle: copy.alternatives?.title ?? 'Two more strips that came close',
    specialEyebrow: copy.specialEyebrow ?? 'Easter Egg · Special Result',
  };
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // /result?preview=1 is used by the admin Site Editor iframe — show a
    // synthetic result so the page can be styled without needing to walk
    // through the whole quiz first.
    const isPreview = typeof window !== 'undefined'
      && new URLSearchParams(window.location.search).get('preview') === '1';
    if (isPreview && !sessionId) {
      setData(PREVIEW_SAMPLE);
      return;
    }
    if (!sessionId) { setError('No session id'); return; }
    fetch(`/api/quiz/result?sessionId=${encodeURIComponent(sessionId)}`)
      .then(r => r.json())
      .then((d) => {
        if (!d.ok) { setError(d.error || 'Not found'); return; }
        setData(d.result);
      })
      .catch((e) => setError(e.message));
  }, [sessionId]);

  if (error) return (
    <div className="container-narrow" style={{ padding: '120px 24px', textAlign: 'center' }}>
      <span className="meta">Error</span>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, marginTop: 12 }}>Couldn&apos;t load result</h2>
      <p style={{ color: 'var(--grey-2)', marginTop: 12 }}>{error}</p>
      <Link href="/quiz" className="btn btn-lg" style={{ marginTop: 24 }}>Try again</Link>
    </div>
  );

  if (!data) return (
    <div className="container-narrow" style={{ padding: '120px 24px', textAlign: 'center' }}>
      <p className="meta">Loading…</p>
    </div>
  );

  // ─── Special rule (เบียว + vangard) — short-circuit, no DNA ───
  if (data.special) {
    return (
      <div className="container-narrow" style={s.specialWrap}>
        <span className="meta">{c.specialEyebrow}</span>
        <h1 style={s.specialH1}>{data.fragrance}</h1>
        <p style={s.specialBlurb}>{data.blurb}</p>
        <div style={s.actions}>
          <Link href="/quiz" className="btn">{c.actionAgain}</Link>
          <Link href="/" className="btn ghost">{c.actionHome}</Link>
        </div>
      </div>
    );
  }

  // ─── Standard result ───
  return (
    <div className="container" style={s.wrap}>
      <header style={s.header}>
        <span className="meta">{c.eyebrowPrefix}{data.pattern}</span>
        <h1 style={s.h1}>
          {c.titleLine1}<br />
          <em style={s.em}>{data.fragrance}</em>
        </h1>
      </header>

      <article style={s.card}>
        <div style={s.cardLeft}>
          {data.image
            ? <img src={data.image} alt={data.fragrance} style={s.bottle} />
            : <BottleSilhouette />}
        </div>
        <div style={s.cardRight}>
          <div style={s.metaRow}>
            <div><div className="meta">House</div><div style={s.metaVal}>{data.house || '—'}</div></div>
            <div><div className="meta">Family</div><div style={s.metaVal}>{data.family || '—'}</div></div>
          </div>

          {data.notes?.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <div className="meta">Key notes</div>
              <ul style={s.notes}>
                {data.notes.map((n, i) => (
                  <li key={i} style={s.note}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          <p style={s.blurb}>{data.blurb}</p>

          {/* Why this match — top 3 axes where the user vector and perfume DNA agree */}
          {data.reasons?.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <div className="meta">Why this match</div>
              <ul style={s.reasonList}>
                {data.reasons.map((r, i) => (
                  <li key={i} style={s.reasonRow}>
                    <span style={s.reasonParam}>{r.param}</span>
                    <span style={s.reasonBar}>
                      <ReasonBar user={r.user} perfume={r.perfume} />
                    </span>
                    <span style={s.reasonNum}>
                      you {fmt(r.user)} · perfume {fmt(r.perfume)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={s.actions}>
            <Link href="/quiz" className="btn">{c.actionAgain}</Link>
            <Link href="/" className="btn ghost">{c.actionHome}</Link>
          </div>
        </div>
      </article>

      {/* Top 2 alternates */}
      {data.alternatives?.length > 0 && (
        <section style={{ marginTop: 56 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span className="meta">{c.altsEyebrow}</span>
            <h3 style={s.altHead}>{c.altsTitle}</h3>
          </div>
          <div style={s.altGrid}>
            {data.alternatives.map((alt, i) => (
              <article key={i} style={s.altCard}>
                <div className="meta">#{i + 2} · distance {alt.distance}</div>
                <h4 style={s.altTitle}>{alt.fragrance}</h4>
                <div style={{ color: 'var(--grey-2)', fontSize: 13, marginTop: 4 }}>
                  {[alt.house, alt.family].filter(Boolean).join(' · ')}
                </div>
                {alt.notes?.length > 0 && (
                  <ul style={{ ...s.notes, marginTop: 14 }}>
                    {alt.notes.slice(0, 4).map((n, j) => <li key={j} style={s.note}>{n}</li>)}
                  </ul>
                )}
                <p style={{ marginTop: 16, color: 'var(--grey-2)', fontSize: 13.5, lineHeight: 1.7 }}>
                  {alt.blurb}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <div style={s.disclaimer}>
        <span className="meta">Beta · Disclosure</span>
        <p style={{ marginTop: 10, color: 'var(--grey-2)', fontSize: 13.5, lineHeight: 1.7 }}>
          ผลลัพธ์นี้เป็นคำแนะนำเบื้องต้นจากระบบของเรา ในเวอร์ชัน beta คำตอบมีจำนวนจำกัด —
          เราจะอัปเดต logic อย่างต่อเนื่องเมื่อเก็บข้อมูลและความเห็นจากผู้ใช้มากขึ้น
        </p>
      </div>
    </div>
  );
}

const fmt = (n) => (n > 0 ? `+${n}` : `${n}`);

/**
 * Tiny visual showing where user (●) and perfume (○) sit on the [-10, +10] axis.
 */
function ReasonBar({ user, perfume }) {
  const pct = (v) => `${((v + 10) / 20) * 100}%`;
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: '100%', height: 6, background: 'var(--grey-5)', borderRadius: 3 }}>
      <span style={{ position: 'absolute', top: '50%', left: '50%', width: 1, height: 8, background: 'var(--grey-3)', transform: 'translate(-50%, -50%)' }} />
      <span style={{
        position: 'absolute', top: '50%', left: pct(perfume),
        width: 8, height: 8, borderRadius: 4,
        border: '1.5px solid var(--ink)', background: 'var(--paper)',
        transform: 'translate(-50%, -50%)',
      }} />
      <span style={{
        position: 'absolute', top: '50%', left: pct(user),
        width: 8, height: 8, borderRadius: 4,
        background: 'var(--ink)',
        transform: 'translate(-50%, -50%)',
      }} />
    </span>
  );
}

function BottleSilhouette() {
  return (
    <svg width="220" height="320" viewBox="0 0 220 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="92" y="20" width="36" height="40" fill="none" stroke="#0a0a0a" strokeWidth="1.4" />
      <rect x="80" y="60" width="60" height="20" fill="none" stroke="#0a0a0a" strokeWidth="1.4" />
      <path d="M50 100 Q50 86 64 86 L156 86 Q170 86 170 100 L170 270 Q170 290 150 290 L70 290 Q50 290 50 270 Z"
            fill="none" stroke="#0a0a0a" strokeWidth="1.4" />
      <line x1="62" y1="220" x2="158" y2="220" stroke="#0a0a0a" strokeWidth="0.8" />
      <text x="110" y="180" textAnchor="middle" fontFamily="'Helvetica Neue',sans-serif" fontSize="32" fill="#0a0a0a">Blot.</text>
      <text x="110" y="200" textAnchor="middle" fontFamily="'JetBrains Mono',monospace" fontSize="8" letterSpacing="2" fill="#8a8a8a">YOUR MATCH</text>
    </svg>
  );
}

const s = {
  wrap: { padding: '80px 24px 120px' },
  header: { textAlign: 'center', marginBottom: 56 },
  h1: { fontFamily: 'var(--font-serif)', fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 300, letterSpacing: '-.02em', lineHeight: 1.05, marginTop: 16 },
  em: { fontStyle: 'italic', fontWeight: 400 },
  card: {
    display: 'grid', gridTemplateColumns: '1fr 1.4fr',
    border: '1px solid var(--grey-5)', background: 'var(--paper)',
  },
  cardLeft: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 60, background: 'var(--offwhite)',
    borderRight: '1px solid var(--grey-5)',
  },
  bottle: { maxWidth: '100%', height: 'auto' },
  cardRight: { padding: 56 },
  metaRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
  metaVal: { fontFamily: 'var(--font-serif)', fontSize: 22, marginTop: 4 },
  notes: { listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, padding: 0 },
  note: { padding: '6px 14px', border: '1px solid var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.15em', textTransform: 'uppercase' },
  blurb: { marginTop: 28, color: 'var(--grey-2)', fontSize: 15, lineHeight: 1.75 },
  actions: { display: 'flex', gap: 12, marginTop: 36, flexWrap: 'wrap' },

  // Reasons
  reasonList: { listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'flex', flexDirection: 'column', gap: 10 },
  reasonRow: {
    display: 'grid',
    gridTemplateColumns: '110px 1fr 200px',
    alignItems: 'center', gap: 16,
    fontSize: 12,
  },
  reasonParam: { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink)' },
  reasonBar: { display: 'block' },
  reasonNum: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-3)', textAlign: 'right' },

  // Alternates
  altHead: { fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, marginTop: 8 },
  altGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 },
  altCard: { padding: '32px 28px', background: 'var(--paper)', border: '1px solid var(--grey-5)', borderRadius: 'var(--radius-lg)' },
  altTitle: { fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, marginTop: 8, letterSpacing: '-.01em' },

  disclaimer: { marginTop: 56, padding: 32, background: 'var(--offwhite)', borderLeft: '2px solid var(--ink)', maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' },

  // Special-rule layout
  specialWrap: { padding: '120px 24px', textAlign: 'center' },
  specialH1: { fontFamily: 'var(--font-serif)', fontSize: 'clamp(34px, 5vw, 56px)', fontWeight: 400, letterSpacing: '-.015em', marginTop: 16, lineHeight: 1.2 },
  specialBlurb: { marginTop: 24, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto', color: 'var(--grey-2)', fontSize: 16, lineHeight: 1.75 },
};

// Synthetic data used by /result?preview=1 in the admin Site Editor so the
// page can be styled even before any quiz has been completed. Mirrors the
// shape returned by /api/quiz/result (special: false, has alternatives).
const PREVIEW_SAMPLE = {
  special: false,
  pattern: 'A1',
  fragrance: 'Sample Fragrance EDP',
  house: 'Maison Demo',
  family: 'Woody Aromatic',
  notes: ['cedar', 'paper', 'amber', 'vetiver'],
  blurb: 'A demo result used by the admin Site Editor preview. Edit theme '
       + 'and copy in the side panel — this card stays the same so you can '
       + 'see how text and colour changes affect the layout.',
  image: null,
  distance: 0.42,
  reasons: [
    { param: 'Masculine', score: 4.2, label: 'Strong match' },
    { param: 'Modern',    score: 3.8, label: 'Aligned' },
    { param: 'Mood',      score: 4.0, label: 'Warm + grounded' },
  ],
  alternatives: [
    {
      fragrance: 'Adjacent Strip One',
      house: 'Studio Two',
      family: 'Woody',
      distance: 0.51,
      notes: ['oak', 'leather', 'tobacco'],
      blurb: 'A close neighbour — slightly drier, more nighttime.',
    },
    {
      fragrance: 'Adjacent Strip Two',
      house: 'Studio Three',
      family: 'Aromatic',
      distance: 0.58,
      notes: ['sage', 'fig', 'rosemary'],
      blurb: 'Same family of feeling — a touch greener and brighter.',
    },
  ],
};
