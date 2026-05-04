'use client';

import { useEffect, useState } from 'react';

export default function PuzzleEasterEggs() {
  const [hit, setHit] = useState(null);
  const [seen, setSeen] = useState(() => new Set());

  useEffect(() => {
    async function onClick(ev) {
      const el = ev.target?.closest?.('a,button,[role="button"]');
      if (!el) return;
      if (el.closest('[data-puzzle-ignore="true"]')) return;
      const isCta = el.classList?.contains('btn') ||
        el.dataset?.puzzleTrigger ||
        el.dataset?.editKey ||
        el.closest?.('.site-header-nav');
      if (!isCta) return;

      const trigger = {
        key: el.dataset?.puzzleTrigger || el.dataset?.editKey || '',
        editKey: el.dataset?.editKey || '',
        text: (el.textContent || '').trim().replace(/\s+/g, ' '),
        href: el.getAttribute?.('href') || '',
        path: window.location.pathname,
      };
      const fingerprint = `${trigger.path}|${trigger.key}|${trigger.text}|${trigger.href}`;
      if (seen.has(fingerprint)) return;

      try {
        const res = await fetch('/api/easter-eggs/puzzle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(trigger),
        });
        const data = await res.json();
        if (!data.ok || !data.result) return;
        setSeen((prev) => new Set([...prev, fingerprint]));
        setHit(data.result);
      } catch (_) {
        // Puzzle interactions should never block normal navigation/clicks.
      }
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [seen]);

  if (!hit) return null;
  const notes = Array.isArray(hit.notes) ? hit.notes : [];

  return (
    <div style={s.scrim} role="dialog" aria-modal="true" aria-label="Puzzle unlocked" data-puzzle-ignore="true">
      <div style={s.modal}>
        <button type="button" onClick={() => setHit(null)} style={s.close} aria-label="Close">×</button>
        <div className="meta">{hit.eyebrow || 'Puzzle unlocked'}</div>
        <h2 style={s.title}>{hit.unlockTitle || 'ยินดีด้วย คุณปลดล็อคบางอย่างแล้ว'}</h2>
        <div style={s.content}>
          <div style={s.imageWrap}>
            {hit.image ? <img src={hit.image} alt="" style={s.image} /> : <div style={s.imageEmpty}>Blot.</div>}
          </div>
          <div>
            <h3 style={s.fragrance}>{hit.fragrance}</h3>
            <p style={s.metaLine}>{[hit.house, hit.family].filter(Boolean).join(' · ')}</p>
            {notes.length > 0 && (
              <ul style={s.notes}>
                {notes.slice(0, 6).map((note) => <li key={note} style={s.note}>{note}</li>)}
              </ul>
            )}
            {hit.blurb && <p style={s.blurb}>{hit.blurb}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  scrim: {
    position: 'fixed',
    inset: 0,
    zIndex: 120,
    background: 'rgba(10,10,10,.58)',
    display: 'grid',
    placeItems: 'center',
    padding: 18,
  },
  modal: {
    position: 'relative',
    width: 'min(760px, 100%)',
    maxHeight: 'min(760px, 92vh)',
    overflow: 'auto',
    background: 'var(--paper)',
    border: '1px solid var(--ink)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 28px 80px rgba(0,0,0,.32)',
    padding: 28,
  },
  close: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 999,
    border: '1px solid var(--grey-5)',
    fontSize: 22,
    lineHeight: 1,
  },
  title: {
    fontFamily: 'var(--font-serif)',
    fontSize: 36,
    fontWeight: 400,
    lineHeight: 1.05,
    marginTop: 12,
    paddingRight: 42,
  },
  content: {
    display: 'grid',
    gridTemplateColumns: 'minmax(160px, 240px) 1fr',
    gap: 24,
    marginTop: 24,
    alignItems: 'center',
  },
  imageWrap: {
    minHeight: 220,
    background: 'var(--offwhite)',
    border: '1px solid var(--grey-5)',
    borderRadius: 'var(--radius-sm)',
    display: 'grid',
    placeItems: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: 240, objectFit: 'contain', padding: 16 },
  imageEmpty: { fontFamily: 'var(--font-serif)', fontSize: 34 },
  fragrance: { fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, margin: 0 },
  metaLine: { marginTop: 4, color: 'var(--grey-3)', fontSize: 13 },
  notes: { display: 'flex', gap: 7, flexWrap: 'wrap', listStyle: 'none', padding: 0, margin: '18px 0 0' },
  note: {
    border: '1px solid var(--ink)',
    borderRadius: 999,
    padding: '4px 9px',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  blurb: { marginTop: 18, color: 'var(--grey-2)', lineHeight: 1.75 },
};
