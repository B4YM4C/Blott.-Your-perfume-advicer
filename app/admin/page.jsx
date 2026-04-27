import { db, dbMode } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const stats = await db.stats();
  const questions = await db.listQuestions();
  const mappings = await db.listMappings();

  return (
    <div>
      <header style={{ marginBottom: 36 }}>
        <span className="meta">Dashboard</span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 42, fontWeight: 400, marginTop: 8 }}>
          Overview
        </h1>
        <p style={{ color: 'var(--grey-2)', marginTop: 8 }}>
          Mode: <strong>{dbMode()}</strong> {dbMode() === 'local' ? '· in-memory mock (no persistence)' : '· SQL'}
        </p>
      </header>

      <div style={grid}>
        <Stat label="Users" value={stats.users} />
        <Stat label="Sessions" value={stats.sessions} />
        <Stat label="Completed" value={stats.completed} />
        <Stat label="Results" value={stats.results} />
        <Stat label="Tracking events" value={stats.events} />
        <Stat label="Questions live" value={questions.length} />
        <Stat label="Mappings" value={mappings.length} />
      </div>

      <section style={{ marginTop: 56 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, marginBottom: 16 }}>Quick actions</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a className="btn" href="/admin/questions">Edit questions</a>
          <a className="btn ghost" href="/admin/mappings">Edit result mapping</a>
          <a className="btn ghost" href="/" target="_blank" rel="noopener">Open public site ↗</a>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={statBox}>
      <div className="meta">{label}</div>
      <div style={statValue}>{value}</div>
    </div>
  );
}

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 14,
};
const statBox = {
  background: 'var(--paper)',
  padding: '28px 24px',
  border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-soft)',
};
const statValue = { fontFamily: 'var(--font-serif)', fontSize: 44, marginTop: 8, lineHeight: 1 };
