'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Four hero tiles at the top of /admin. Each tile is clickable — selecting
 * one expands a drawer showing up to 3 most recent records that match that
 * bucket (today / week / lifetime / easter eggs). A second click on the
 * active tile collapses the drawer.
 *
 * The previews come from the server (already filtered + capped to 3) so
 * this component stays fully presentational.
 */
export default function HeroTiles({ summary, eggsActive, previews }) {
  // bucket keys: 'today' | 'week' | 'total' | 'special'  (null = collapsed)
  const [open, setOpen] = useState(null);

  const tiles = [
    {
      key: 'today',
      label: 'Completed today',
      value: summary.completedToday,
      hint: 'last 24 hours',
    },
    {
      key: 'week',
      label: 'This week',
      value: summary.completedWeek,
      hint: 'last 7 days',
    },
    {
      key: 'total',
      label: 'All-time',
      value: summary.completedTotal,
      hint: 'lifetime completions',
    },
    {
      key: 'special',
      label: 'Easter eggs hit',
      value: summary.specialHits,
      hint: `${eggsActive} rules active`,
    },
  ];

  const toggle = (key) => setOpen((cur) => (cur === key ? null : key));
  const activeTile = tiles.find((t) => t.key === open);
  const activePreview = open ? previews[open] || [] : [];

  return (
    <>
      <div style={heroGrid}>
        {tiles.map((t) => {
          const isActive = open === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => toggle(t.key)}
              aria-expanded={isActive}
              aria-controls="hero-drawer"
              style={{
                ...heroBox,
                ...(isActive ? heroBoxActive : null),
              }}
            >
              <div className="meta" style={{ color: isActive ? 'var(--paper)' : undefined }}>
                {t.label}
              </div>
              <div style={heroValue}>{t.value}</div>
              {t.hint && (
                <div
                  style={{
                    color: isActive ? 'var(--grey-5)' : 'var(--grey-3)',
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {t.hint}
                </div>
              )}
              <div
                style={{
                  marginTop: 10,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '.2em',
                  textTransform: 'uppercase',
                  color: isActive ? 'var(--paper)' : 'var(--grey-3)',
                }}
              >
                {isActive ? '↑ Hide preview' : '↓ Preview last 3'}
              </div>
            </button>
          );
        })}
      </div>

      {activeTile && (
        <div id="hero-drawer" style={drawer}>
          <div style={drawerHead}>
            <div>
              <div className="meta" style={{ color: 'var(--grey-3)' }}>
                Preview · {activeTile.label}
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, marginTop: 4 }}>
                {activePreview.length === 0
                  ? 'No matching records yet.'
                  : `Showing ${activePreview.length} most recent`}
              </div>
            </div>
            <Link href={`/admin/sessions${open === 'special' ? '?special=1' : ''}`} style={moreLink}>
              View all →
            </Link>
          </div>

          {activePreview.length > 0 && (
            <div>
              <div style={{ ...row, ...rowHead }}>
                <div>When</div>
                <div>User</div>
                <div>Result</div>
                <div></div>
              </div>
              {activePreview.map((s) => (
                <div key={s.id} style={row}>
                  <div style={{ fontSize: 12, color: 'var(--grey-2)' }}>{fmtRel(s.completedAt)}</div>
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
                  <div style={{ textAlign: 'right' }}>
                    <Link href={`/admin/sessions/${s.id}`} style={moreLink}>
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
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
  border: '1px solid var(--ink)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-soft)',
  textAlign: 'left',
  cursor: 'pointer',
  font: 'inherit',
  color: 'var(--ink)',
  transition: 'transform .15s ease, box-shadow .15s ease',
};
const heroBoxActive = {
  background: 'var(--ink)',
  color: 'var(--paper)',
  borderColor: 'var(--ink)',
  transform: 'translateY(-1px)',
  boxShadow: '0 14px 32px rgba(10,10,10,.22)',
};
const heroValue = { fontFamily: 'var(--font-serif)', fontSize: 44, marginTop: 8, lineHeight: 1 };

const drawer = {
  marginTop: 16,
  background: 'var(--paper)',
  border: '1px solid var(--ink)',
  borderRadius: 'var(--radius-md)',
  padding: '20px 24px',
  boxShadow: 'var(--shadow-soft)',
};
const drawerHead = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  marginBottom: 14,
  gap: 16,
  flexWrap: 'wrap',
};

const row = {
  display: 'grid',
  gridTemplateColumns: '110px 1.4fr 2fr 80px',
  gap: 14,
  padding: '12px 0',
  borderTop: '1px solid var(--grey-5)',
  alignItems: 'center',
};
const rowHead = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: 'var(--grey-3)',
  borderTop: 'none',
  paddingTop: 0,
};
const moreLink = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: 'var(--ink)',
};
const specialPill = {
  display: 'inline-block',
  marginLeft: 8,
  padding: '1px 8px',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  letterSpacing: '.18em',
  textTransform: 'uppercase',
  background: 'var(--ink)',
  color: 'var(--paper)',
  borderRadius: 999,
};
