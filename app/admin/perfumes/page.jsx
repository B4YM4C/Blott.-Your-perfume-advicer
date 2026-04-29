import Link from 'next/link';
import { db } from '@/lib/db';
import { ui } from '../_ui';
import PerfumesIO from './PerfumesIO';

export const dynamic = 'force-dynamic';

export default async function PerfumesList() {
  const perfumes = await db.listPerfumes();

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <span className="meta">Library</span>
          <h1 style={ui.h1}>Perfumes</h1>
          <p style={{ color: 'var(--grey-2)', marginTop: 4, fontSize: 14 }}>
            {perfumes.length} ขวด — DNA ของน้ำหอมที่ระบบใช้แมตช์กับโปรไฟล์ผู้ใช้
          </p>
        </div>
        <Link href="/admin/perfumes/new" className="btn">+ Add perfume</Link>
      </header>

      {/* CSV Export / Import — fill in answer-keys (เฉลย) outside the app and bulk-load. */}
      <PerfumesIO />

      <div style={table}>
        <div style={{ ...row, ...rowHead }}>
          <div>Bottle</div>
          <div>Fragrance</div>
          <div>House · Family</div>
          <div>Notes</div>
          <div></div>
        </div>
        {perfumes.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--grey-3)' }}>
            ยังไม่มีน้ำหอม — กด <em>+ Add perfume</em> เพื่อเริ่ม
          </div>
        )}
        {perfumes.map((p) => (
          <div key={p.id} style={row}>
            <div>
              {p.image
                ? <img src={p.image} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--grey-5)' }} />
                : <div style={emptyImg}>—</div>}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>{p.fragrance}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-3)', marginTop: 4 }}>{p.id}</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey-2)' }}>
              {[p.house, p.family].filter(Boolean).join(' · ') || '—'}
            </div>
            <div style={{ fontSize: 12 }}>
              {(p.notes || []).slice(0, 4).map((n, i) => (
                <span key={i} style={chip}>{n}</span>
              ))}
            </div>
            <div style={{ textAlign: 'right' }}>
              <Link href={`/admin/perfumes/${p.id}`} style={editLink}>Edit →</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const table = {
  background: 'var(--paper)', border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-soft)', overflow: 'hidden',
};
const row = {
  display: 'grid', gridTemplateColumns: '70px 2fr 1.5fr 2fr 80px',
  gap: 16, padding: '16px 22px', borderBottom: '1px solid var(--grey-5)', alignItems: 'center',
};
const rowHead = {
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.2em',
  textTransform: 'uppercase', color: 'var(--grey-3)', background: 'var(--offwhite)',
};
const chip = {
  display: 'inline-block', padding: '2px 8px', border: '1px solid var(--grey-4)',
  marginRight: 4, marginBottom: 4, fontFamily: 'var(--font-mono)', fontSize: 9,
  borderRadius: 999,
};
const emptyImg = {
  width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--offwhite)', border: '1px dashed var(--grey-4)', borderRadius: 6,
  color: 'var(--grey-3)',
};
const editLink = {
  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase',
};
