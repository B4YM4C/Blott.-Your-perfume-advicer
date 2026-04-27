'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MappingsEditor({ initial }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // CSV upload state
  const fileRef = useRef(null);
  const [uploadMode, setUploadMode] = useState('append'); // 'append' | 'replace'
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploading, setUploading] = useState(false);

  function update(i, patch) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function add() {
    setItems((arr) => [...arr, { pattern: '1A2A3A4A5A', fragrance: '', house: '', family: '', notes: [], blurb: '', image: null }]);
  }
  function remove(i) {
    if (!confirm('Remove this mapping?')) return;
    setItems((arr) => arr.filter((_, idx) => idx !== i));
  }

  async function save() {
    setSaving(true); setMsg('');
    try {
      const r = await fetch('/api/admin/mappings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: items }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'Save failed');
      setMsg('Saved · ' + new Date().toLocaleTimeString());
    } catch (e) { setMsg('Error: ' + e.message); }
    finally { setSaving(false); }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus(null);
    try {
      const csv = await file.text();
      const r = await fetch('/api/admin/mappings/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv, mode: uploadMode }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'Upload failed');
      setUploadStatus({
        ok: true,
        text: `${uploadMode === 'replace' ? 'Replaced' : 'Appended'} ${d.inserted} mapping(s)${d.skipped ? ` · ${d.skipped} skipped` : ''}`,
        details: d.errors,
      });
      router.refresh();
      // Re-fetch the canonical list so the editor stays in sync
      const fresh = await fetch('/api/admin/mappings').then((x) => x.json());
      if (fresh.ok) setItems(fresh.mappings);
    } catch (err) {
      setUploadStatus({ ok: false, text: err.message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div>
      <header style={{ marginBottom: 28 }}>
        <span className="meta">Content</span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, marginTop: 6 }}>Result Mapping</h1>
        <p style={{ color: 'var(--grey-2)', fontSize: 14, marginTop: 6, maxWidth: 720 }}>
          เชื่อมรหัสคำตอบ (เช่น <code style={code}>1B2B3C4D5B</code>) → น้ำหอม.
          ใช้ <code style={code}>*</code> เป็น wildcard เพื่อจับหลายคำตอบ เช่น <code style={code}>1*2*3D4*5*</code>.
          แถวที่ pattern = <code style={code}>default</code> คือ fallback
        </p>
      </header>

      {/* ============== CSV import / export panel ============== */}
      <section style={importPanel}>
        <div>
          <div className="meta" style={{ marginBottom: 6 }}>Bulk import · CSV</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>
            Upload patterns from a spreadsheet
          </h2>
          <p style={{ fontSize: 13, color: 'var(--grey-2)', marginTop: 6, maxWidth: 560 }}>
            ดาวน์โหลด template ก่อน → กรอกข้อมูลใน Excel/Numbers/Sheets → บันทึกเป็น <code style={code}>.csv</code> →
            อัพโหลดที่นี่ (เลือก append เพื่อต่อท้าย หรือ replace เพื่อล้างของเก่าทิ้งทั้งหมด).
            คอลัมน์ที่ต้องมี: <code style={code}>pattern</code>, <code style={code}>fragrance</code>;
            ที่เหลือ optional: <code style={code}>house, family, notes, blurb, image</code>.
            ใส่หลาย note ด้วย <code style={code}>|</code> เช่น <code style={code}>Bergamot|Vetiver</code>.
          </p>
        </div>

        <div style={importControls}>
          <a href="/api/admin/mappings/template" className="btn ghost btn-sm" download>
            ↓ Download template
          </a>

          <div style={modeRow}>
            <label style={modeLabel}>
              <input
                type="radio"
                name="upload-mode"
                value="append"
                checked={uploadMode === 'append'}
                onChange={() => setUploadMode('append')}
              />
              <span>Append</span>
            </label>
            <label style={modeLabel}>
              <input
                type="radio"
                name="upload-mode"
                value="replace"
                checked={uploadMode === 'replace'}
                onChange={() => setUploadMode('replace')}
              />
              <span>Replace all</span>
            </label>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
          <button
            className="btn"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : '↑ Upload CSV'}
          </button>
        </div>

        {uploadStatus && (
          <div style={{
            ...uploadStatusBox,
            background: uploadStatus.ok ? 'var(--offwhite)' : '#fff5f5',
            borderColor: uploadStatus.ok ? 'var(--grey-5)' : '#ffd0d0',
            color: uploadStatus.ok ? 'var(--ink)' : '#a4001f',
          }}>
            {uploadStatus.ok ? '✓' : '✗'} {uploadStatus.text}
            {uploadStatus.details?.length > 0 && (
              <ul style={{ marginTop: 8, marginLeft: 18, fontSize: 12 }}>
                {uploadStatus.details.slice(0, 5).map((d, i) => <li key={i}>{d}</li>)}
                {uploadStatus.details.length > 5 && <li>…and {uploadStatus.details.length - 5} more</li>}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* ============== inline editor (existing) ============== */}
      {items.map((m, i) => (
        <div key={i} style={card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Pattern">
              <input value={m.pattern} onChange={(e) => update(i, { pattern: e.target.value })} style={{ ...input, fontFamily: 'var(--font-mono)' }} />
            </Field>
            <Field label="Fragrance name">
              <input value={m.fragrance} onChange={(e) => update(i, { fragrance: e.target.value })} style={input} />
            </Field>
            <Field label="House">
              <input value={m.house || ''} onChange={(e) => update(i, { house: e.target.value })} style={input} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginTop: 8 }}>
            <Field label="Family">
              <input value={m.family || ''} onChange={(e) => update(i, { family: e.target.value })} style={input} />
            </Field>
            <Field label="Notes (comma separated)">
              <input
                value={(m.notes || []).join(', ')}
                onChange={(e) => update(i, { notes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                style={input} />
            </Field>
          </div>
          <Field label="Blurb">
            <textarea value={m.blurb || ''} onChange={(e) => update(i, { blurb: e.target.value })} style={{ ...input, height: 80 }} />
          </Field>
          <Field label="Image URL (optional)">
            <input value={m.image || ''} onChange={(e) => update(i, { image: e.target.value || null })} style={input} />
          </Field>
          <button onClick={() => remove(i)} className="btn ghost btn-sm" style={{ marginTop: 8 }}>Remove</button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        <button onClick={add} className="btn ghost">+ Add mapping</button>
        <button onClick={save} className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save all'}</button>
        {msg && <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--grey-2)' }}>{msg}</span>}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="meta" style={{ marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const card = {
  background: 'var(--paper)',
  border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-soft)',
  padding: 22,
  marginBottom: 14,
};
const input = {
  width: '100%', padding: '10px 14px', border: '1px solid var(--grey-5)',
  fontFamily: 'var(--font-sans)', fontSize: 13.5, outline: 'none', background: 'var(--paper)',
  borderRadius: 'var(--radius-sm)',
};
const code = { fontFamily: 'var(--font-mono)', background: 'var(--offwhite)', padding: '1px 6px', borderRadius: 4 };

const importPanel = {
  background: 'var(--paper)',
  border: '1px dashed var(--grey-4)',
  borderRadius: 'var(--radius-lg)',
  padding: 28,
  marginBottom: 28,
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 20,
};
const importControls = {
  display: 'flex',
  gap: 14,
  flexWrap: 'wrap',
  alignItems: 'center',
};
const modeRow = { display: 'flex', gap: 10 };
const modeLabel = {
  display: 'inline-flex',
  gap: 6,
  alignItems: 'center',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: 'var(--grey-2)',
  cursor: 'pointer',
  padding: '6px 12px',
  border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--paper)',
};
const uploadStatusBox = {
  padding: '12px 16px',
  border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-md)',
  fontSize: 13,
  fontFamily: 'var(--font-mono)',
  letterSpacing: '.04em',
  marginTop: 4,
};
