import Link from 'next/link';

export const metadata = { title: 'Admin · Blot.' };

export default function AdminLayout({ children }) {
  return (
    <div style={shell}>
      <aside style={sidebar}>
        <div style={brandWrap}>
          <div style={brand}>Blot.<span style={{ color: 'var(--grey-3)' }}>/admin</span></div>
          <div className="meta" style={{ marginTop: 6, color: 'var(--grey-3)' }}>Back office</div>
        </div>
        <nav style={nav}>
          <Link href="/admin" style={navLink}>Dashboard</Link>
          <Link href="/admin/params" style={navLink}>Parameters</Link>
          <Link href="/admin/questions" style={navLink}>Questions</Link>
          <Link href="/admin/perfumes" style={navLink}>Perfumes</Link>
          <Link href="/admin/easter-eggs" style={navLink}>Easter Eggs</Link>
          <Link href="/admin/mappings" style={{ ...navLink, color: 'var(--grey-3)' }}>Result Mapping (legacy)</Link>
          <a href="/" style={{ ...navLink, marginTop: 32, color: 'var(--grey-3)' }}>← Back to site</a>
        </nav>
      </aside>
      <section style={main}>{children}</section>
    </div>
  );
}

const shell = { display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh' };
const sidebar = { background: 'var(--ink)', color: 'var(--paper)', padding: '32px 24px' };
const brandWrap = { paddingBottom: 24, borderBottom: '1px solid #1a1a1a' };
const brand = { fontFamily: 'var(--font-serif)', fontSize: 22, letterSpacing: '-.01em' };
const nav = { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 24 };
const navLink = {
  padding: '10px 12px',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '.18em',
  textTransform: 'uppercase',
  color: 'var(--paper)',
  borderLeft: '2px solid transparent',
};
const main = { padding: '40px 48px', background: 'var(--offwhite)' };
