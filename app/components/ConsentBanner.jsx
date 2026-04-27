'use client';

import { useEffect, useState } from 'react';

const CONSENT_KEY = 'blott_consent';

/**
 * ConsentBanner — PDPA-compliant call-for-consent.
 *
 * - Shows until the user explicitly accepts or rejects.
 * - Stores consent flag in localStorage + POSTs to /api/consent so we can log
 *   the decision server-side (attached to the session cookie, no PII).
 * - Rejecting disables tracking events but still allows the quiz to run.
 *
 * Complies with Thailand PDPA B.E. 2562 (Personal Data Protection Act).
 */
export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [choice, setChoice] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONSENT_KEY);
      if (!saved) setVisible(true);
      else setChoice(saved);
    } catch (_) {
      setVisible(true);
    }
  }, []);

  async function decide(value) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: value, ts: Date.now() }),
      });
    } catch (_) { /* local mode: ignore */ }
    setChoice(value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div role="dialog" aria-label="Cookie consent" style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.label}>PDPA · Cookie Consent</div>
        <h4 style={styles.title}>ก่อนเริ่มค้นหากลิ่น</h4>
        <p style={styles.body}>
          Blot. ใช้ cookie เพื่อจดจำคำตอบของคุณและปรับประสบการณ์ให้เหมาะสม
          เราเคารพ <strong>PDPA</strong> ของประเทศไทย — คุณเลือกยอมรับหรือปฏิเสธได้ตลอดเวลา
          หากปฏิเสธ quiz ยังใช้งานได้ แต่เราจะไม่บันทึกพฤติกรรมของคุณ
        </p>
        <div style={styles.actions}>
          <button className="btn ghost btn-sm" onClick={() => decide('rejected')}>Reject</button>
          <button className="btn btn-sm" onClick={() => decide('accepted')}>Accept</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    position: 'fixed',
    left: 0, right: 0, bottom: 0,
    zIndex: 100,
    display: 'flex',
    justifyContent: 'center',
    padding: '24px',
    pointerEvents: 'none',
  },
  card: {
    pointerEvents: 'auto',
    maxWidth: 560,
    width: '100%',
    background: 'var(--paper)',
    border: '1px solid var(--grey-5)',
    borderRadius: 'var(--radius-lg)',
    padding: '28px 32px',
    boxShadow: '0 24px 60px -20px rgba(0,0,0,0.35)',
  },
  label: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '.3em',
    textTransform: 'uppercase',
    color: 'var(--grey-3)',
    marginBottom: 10,
  },
  title: {
    fontFamily: 'var(--font-serif)',
    fontSize: 26,
    fontWeight: 400,
    marginBottom: 10,
    letterSpacing: '-0.01em',
  },
  body: {
    fontSize: 13.5,
    color: 'var(--grey-2)',
    lineHeight: 1.7,
    marginBottom: 20,
  },
  actions: { display: 'flex', gap: 12, justifyContent: 'flex-end' },
};
