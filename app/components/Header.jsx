'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Logo from './Logo';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/quiz', label: 'Start Quiz' },
  { href: '/#about', label: 'About' },
];

export default function Header({ copy = {}, locale = 'th' }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = Array.isArray(copy.navigation?.items) && copy.navigation.items.length
    ? copy.navigation.items
    : NAV;
  const ctas = Array.isArray(copy.navigation?.ctas) && copy.navigation.ctas.length
    ? copy.navigation.ctas
    : [copy.navigation?.cta || { href: '/quiz', label: 'Begin the dip →', key: 'header-primary' }];
  const currentLocale = locale === 'en' ? 'en' : 'th';

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (isAdmin) return null; // admin has its own chrome

  function switchLanguage(nextLocale) {
    if (nextLocale === currentLocale) return;
    document.cookie = `blott_lang=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  }

  return (
    <header className="site-header" style={styles.header}>
      <div className="site-header-inner" style={styles.inner}>
        <Link className="site-header-brand" href="/" style={styles.brand} aria-label="Blot. — Home">
          <Logo width={96} invert />
        </Link>

        <nav className="site-header-nav" style={styles.nav} aria-label="Primary">
          {navItems.map((item, index) => (
            <Link
              key={`${item.href}-${index}`}
              href={item.href}
              data-puzzle-trigger={`nav:${item.key || item.label || item.href}`}
              data-edit-key={`navigation.items.${index}.label`}
              data-structure-list="navigation.items"
              data-structure-index={index}
              data-structure-id={item.key || item.href || index}
              data-structure-kind="menu"
              style={{
                ...styles.navLink,
                ...normalizeTextStyle(item.style),
                ...(pathname === item.href ? styles.navLinkActive : {}),
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <LanguageToggle locale={currentLocale} onSwitch={switchLanguage} />

        <div className="site-header-ctas" style={styles.ctas}>
          {ctas.map((cta, index) => (
            <Link
              key={`${cta.href}-${index}`}
              href={cta.href || '/quiz'}
              className={`btn btn-sm ${cta.variant === 'ghost' ? 'ghost inverted' : 'inverted'} site-header-cta`}
              style={{ ...styles.cta, ...normalizeTextStyle(cta.style) }}
              data-puzzle-trigger={`cta:${cta.key || cta.label || 'header'}`}
              data-edit-key={index === 0 ? 'navigation.cta.label' : `navigation.ctas.${index}.label`}
              data-structure-list="navigation.ctas"
              data-structure-index={index}
              data-structure-id={cta.key || cta.href || index}
              data-structure-kind="cta"
            >
              {cta.label || 'Begin the dip →'}
            </Link>
          ))}
        </div>

        <div className="site-header-mobile-tools" style={styles.mobileTools}>
          <LanguageToggle locale={currentLocale} onSwitch={switchLanguage} compact />
          <button
            type="button"
            className={`site-header-menu-button ${menuOpen ? 'is-open' : ''}`}
            style={styles.menuButton}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span style={styles.menuLine} />
            <span style={styles.menuLine} />
            <span style={styles.menuLine} />
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={`site-mobile-menu ${menuOpen ? 'is-open' : ''}`}
        style={styles.mobileMenu}
      >
        <nav style={styles.mobileNav} aria-label="Mobile primary">
          {navItems.map((item, index) => (
            <Link
              key={`${item.href}-${index}`}
              href={item.href}
              data-puzzle-trigger={`nav:${item.key || item.label || item.href}`}
              data-edit-key={`navigation.items.${index}.label`}
              data-structure-list="navigation.items"
              data-structure-index={index}
              data-structure-id={item.key || item.href || index}
              data-structure-kind="menu"
              style={{
                ...styles.mobileNavLink,
                ...normalizeTextStyle(item.style),
                ...(pathname === item.href ? styles.mobileNavLinkActive : {}),
              }}
            >
              {item.label}
            </Link>
          ))}
          {ctas.map((cta, index) => (
            <Link
              key={`${cta.href}-${index}`}
              href={cta.href || '/quiz'}
              className={`btn ${cta.variant === 'ghost' ? 'ghost inverted' : 'inverted'}`}
              style={{ ...styles.mobileCta, ...normalizeTextStyle(cta.style) }}
              data-puzzle-trigger={`cta:${cta.key || cta.label || 'header'}`}
              data-edit-key={index === 0 ? 'navigation.cta.label' : `navigation.ctas.${index}.label`}
              data-structure-list="navigation.ctas"
              data-structure-index={index}
              data-structure-id={cta.key || cta.href || index}
              data-structure-kind="cta"
            >
              {cta.label || 'Begin the dip →'}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function LanguageToggle({ locale, onSwitch, compact = false }) {
  return (
    <div className={`site-language-toggle ${compact ? 'is-compact' : ''}`} style={styles.langToggle} aria-label="Language">
      {['th', 'en'].map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => onSwitch(code)}
            aria-pressed={active}
            style={{
              ...styles.langOption,
              ...(active ? styles.langOptionActive : {}),
              ...(compact ? styles.langOptionCompact : {}),
            }}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
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
  ctas: { display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 },
  cta: { whiteSpace: 'nowrap' },
  mobileTools: {
    display: 'none',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  langToggle: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: 3,
    border: '1px solid rgba(255,255,255,.32)',
    borderRadius: 999,
    color: 'var(--grey-4)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '.16em',
    flexShrink: 0,
  },
  langOption: {
    minWidth: 38,
    height: 34,
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'inherit',
    background: 'transparent',
  },
  langOptionActive: {
    background: 'var(--paper)',
    color: 'var(--ink)',
  },
  langOptionCompact: {
    minWidth: 34,
    height: 32,
  },
  menuButton: {
    display: 'none',
    width: 44,
    height: 44,
    border: '1px solid rgba(255,255,255,.32)',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 5,
    background: 'transparent',
    color: 'var(--paper)',
    flexShrink: 0,
  },
  menuLine: {
    display: 'block',
    width: 18,
    height: 1,
    background: 'currentColor',
  },
  mobileMenu: {
    display: 'none',
    borderTop: '1px solid #1a1a1a',
    background: 'var(--ink)',
  },
  mobileNav: {
    maxWidth: 1180,
    margin: '0 auto',
    padding: '12px 18px 18px',
    display: 'grid',
    gap: 4,
  },
  mobileNavLink: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '.18em',
    textTransform: 'uppercase',
    color: 'var(--grey-4)',
    padding: '13px 2px',
    borderBottom: '1px solid rgba(255,255,255,.12)',
  },
  mobileNavLinkActive: { color: 'var(--paper)' },
  mobileCta: {
    marginTop: 10,
    width: '100%',
  },
};

function normalizeTextStyle(style) {
  if (!style || typeof style !== 'object') return {};
  const out = {};
  for (const key of ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'textTransform', 'color']) {
    if (style[key]) out[key] = style[key];
  }
  return out;
}
