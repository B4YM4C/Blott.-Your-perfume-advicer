'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';

const DEFAULT_FOOTER = {
  tagline: 'Your perfume advisor.',
  signature: 'One dip. One match.',
  columns: [
    {
      title: 'Discover',
      links: [
        { label: 'The Quiz', href: '/quiz' },
        { label: 'About Blot.', href: '/#about' },
        { label: 'Our Method', href: '/#method' },
        { label: 'Journal', href: '/#journal' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy · PDPA', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Cookie Policy', href: '/cookies' },
      ],
    },
    {
      title: 'Contact',
      links: [
        { label: 'hello@blott.app', href: 'mailto:hello@blott.app' },
        { label: 'Press Kit', href: '/press' },
        { label: 'Partners', href: '/partners' },
      ],
    },
  ],
  bottom: {
    copyright: 'Blot.',
    compliance: 'Made in Bangkok · Compliant with PDPA B.E. 2562',
    tagline: 'One dip. One match.',
  },
};

export default function Footer({ copy = {} }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;

  const year = new Date().getFullYear();
  const footer = { ...DEFAULT_FOOTER, ...(copy.footer || {}) };
  const columns = Array.isArray(footer.columns) && footer.columns.length ? footer.columns : DEFAULT_FOOTER.columns;
  const bottom = { ...DEFAULT_FOOTER.bottom, ...(footer.bottom || {}) };

  return (
    <footer className="site-footer" style={styles.footer}>
      <div style={styles.topBar} />

      <div className="site-footer-inner" style={styles.inner}>
        <div className="site-footer-brand" style={styles.brandCol}>
          <Logo width={120} color="#ffffff" barColor="#ffffff" />
          <p style={styles.tagline} data-edit-key="footer.tagline">
            {footer.tagline} <br />
            <em style={{ fontFamily: 'var(--font-serif)' }} data-edit-key="footer.signature">{footer.signature}</em>
          </p>
        </div>

        {columns.map((col, colIndex) => (
          <div
            key={`${col.title || 'footer'}-${colIndex}`}
            className="site-footer-col"
            style={styles.col}
            data-structure-list="footer.columns"
            data-structure-index={colIndex}
            data-structure-id={col.title || colIndex}
            data-structure-kind="footer-column"
          >
            <h5 style={styles.colTitle} data-edit-key={`footer.columns.${colIndex}.title`}>{col.title}</h5>
            <ul style={styles.list}>
              {(Array.isArray(col.links) ? col.links : []).map((link, linkIndex) => {
                const href = link.href || '/';
                const external = href.startsWith('mailto:') || href.startsWith('http');
                const label = link.label || 'Link';
                return (
                  <li
                    key={`${href}-${linkIndex}`}
                    data-structure-list={`footer.columns.${colIndex}.links`}
                    data-structure-index={linkIndex}
                    data-structure-id={href}
                    data-structure-kind="footer-link"
                  >
                    {external ? (
                      <a href={href} style={styles.link} data-edit-key={`footer.columns.${colIndex}.links.${linkIndex}.label`}>
                        {label}
                      </a>
                    ) : (
                      <Link href={href} style={styles.link} data-edit-key={`footer.columns.${colIndex}.links.${linkIndex}.label`}>
                        {label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="site-footer-bottom" style={styles.bottomStrip}>
        <span style={styles.meta}>© {year} <span data-edit-key="footer.bottom.copyright">{bottom.copyright}</span></span>
        <span style={styles.meta} data-edit-key="footer.bottom.compliance">{bottom.compliance}</span>
        <span style={styles.meta} data-edit-key="footer.bottom.tagline">{bottom.tagline}</span>
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
