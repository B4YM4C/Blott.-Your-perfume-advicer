'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/quiz', label: 'Start Quiz' },
  { href: '/#about', label: 'About' },
];

export default function Header() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) return null; // admin has its own chrome

  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        <Link href="/" style={styles.brand} aria-label="Blot. — Home">
          <Logo width={96} invert />
        </Link>

        <nav style={styles.nav} aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...styles.navLink,
                ...(pathname === item.href ? styles.navLinkActive : {}),
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href="/quiz" className="btn btn-sm inverted" style={styles.cta}>
          Begin the dip →
        </Link>
      </div>
    </header>
  );
}

const styles = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    background: 'var(--ink)',
    color: 'var(--paper)',
    borderBottom: '1px solid #1a1a1a',
  },
  inner: {
    maxWidth: 1180,
    margin: '0 auto',
    padding: '18px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 32,
  },
  brand: { display: 'inline-flex', alignItems: 'center' },
  nav: { display: 'flex', gap: 32, flex: 1, justifyContent: 'center' },
  navLink: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '.22em',
    textTransform: 'uppercase',
    color: 'var(--grey-4)',
    padding: '6px 2px',
    borderBottom: '1px solid transparent',
    transition: 'color .2s ease, border-color .2s ease',
  },
  navLinkActive: { color: 'var(--paper)', borderBottomColor: 'var(--paper)' },
  cta: { whiteSpace: 'nowrap' },
};
