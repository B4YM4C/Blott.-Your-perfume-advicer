'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;

  const year = new Date().getFullYear();

  return (
    <footer style={styles.footer}>
      <div style={styles.topBar} />

      <div style={styles.inner}>
        <div style={styles.brandCol}>
          <Logo width={120} color="#ffffff" barColor="#ffffff" />
          <p style={styles.tagline}>
            Your perfume advisor. <br />
            <em style={{ fontFamily: 'var(--font-serif)' }}>One dip. One match.</em>
          </p>
        </div>

        <div style={styles.col}>
          <h5 style={styles.colTitle}>Discover</h5>
          <ul style={styles.list}>
            <li><Link href="/quiz" style={styles.link}>The Quiz</Link></li>
            <li><Link href="/#about" style={styles.link}>About Blot.</Link></li>
            <li><Link href="/#method" style={styles.link}>Our Method</Link></li>
            <li><Link href="/#journal" style={styles.link}>Journal</Link></li>
          </ul>
        </div>

        <div style={styles.col}>
          <h5 style={styles.colTitle}>Legal</h5>
          <ul style={styles.list}>
            <li><Link href="/privacy" style={styles.link}>Privacy · PDPA</Link></li>
            <li><Link href="/terms" style={styles.link}>Terms of Service</Link></li>
            <li><Link href="/cookies" style={styles.link}>Cookie Policy</Link></li>
          </ul>
        </div>

        <div style={styles.col}>
          <h5 style={styles.colTitle}>Contact</h5>
          <ul style={styles.list}>
            <li><a href="mailto:hello@blott.app" style={styles.link}>hello@blott.app</a></li>
            <li><Link href="/press" style={styles.link}>Press Kit</Link></li>
            <li><Link href="/partners" style={styles.link}>Partners</Link></li>
          </ul>
        </div>
      </div>

      <div style={styles.bottomStrip}>
        <span style={styles.meta}>© {year} Blot.</span>
        <span style={styles.meta}>Made in Bangkok · Compliant with PDPA B.E. 2562</span>
        <span style={styles.meta}>One dip. One match.</span>
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    background: 'var(--ink)',
    color: 'var(--paper)',
    marginTop: 0,
  },
  topBar: { height: 1, background: 'linear-gradient(90deg, transparent, #bfbfbf, transparent)' },
  inner: {
    maxWidth: 1180,
    margin: '0 auto',
    padding: '72px 24px 48px',
    display: 'grid',
    gridTemplateColumns: '1.6fr 1fr 1fr 1fr',
    gap: 48,
  },
  brandCol: { paddingRight: 24 },
  tagline: {
    marginTop: 20,
    color: 'var(--grey-4)',
    fontSize: 14,
    lineHeight: 1.7,
  },
  col: {},
  colTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '.3em',
    textTransform: 'uppercase',
    color: 'var(--grey-4)',
    marginBottom: 20,
  },
  list: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 },
  link: {
    color: 'var(--paper)',
    fontSize: 14,
    fontFamily: 'var(--font-serif)',
    transition: 'opacity .2s',
  },
  bottomStrip: {
    borderTop: '1px solid #1a1a1a',
    maxWidth: 1180,
    margin: '0 auto',
    padding: '22px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  meta: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '.2em',
    textTransform: 'uppercase',
    color: 'var(--grey-4)',
  },
};
