'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ui } from '../../_ui';

export default function PerfumeEditor({ initial, isNew, paramConfig }) {
  const router = useRouter();
  const [p, setP] = useState(() => ({
    ...initial,
    notes: Array.isArray(initial.notes) ? initial.notes : [],
    dna: initial.dna || {},
    i18n: initial.i18n || {},
  }));
  const [notesText, setNotesText] = useState(() => (initial.notes || []).join(', '));
  const [notesEnText, setNotesEnText] = useState(() => (initial.i18n?.en?.notes || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const allParams = useMemo(() => {
    const core = (paramConfig?.core || []).map((x) => ({ ...x, group: 'core' }));
    const meta = (paramConfig?.meta || []).map((x) => ({ ...x, group: 'meta' }));
    return { core, meta, all: [...core, ...meta] };
  }, [paramConfig]);

  function update(patch) { setP((prev) => ({ ...prev, ...patch })); }
  function setI18n(locale, field, value) {
    setP((prev) => ({
      ...prev,
      i18n: {
        ...(prev.i18n || {}),
        [locale]: { ...(prev.i18n?.[locale] || {}), [field]: value },
      },
    }));
  }
  function setDna(name, val) {
    setP((prev) => {
      const dna = { ...(prev.dna || {}) };
      if (val === '' || val === null) delete dna[name];
      else dna[name] = Number(val);
      return { ...prev, dna };
    });
  }
  function fillRandom() {
    const dna = {};
    for (const x of allParams.all) dna[x.name] = Math.round((Math.random() * 20 - 10));
    update({ dna });
  }
  function clearDna() { update({ dna: {} }); }

  async function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error);
      update({ image: d.url });
    } catch (e) { setError('Upload failed: ' + e.message); }
    finally { setUploading(false); }
  }

  async function save() {
    setSaving(true); setError('');
    try {
      // commit notesText into array
      const notes = notesText.split(',').map((s) => s.trim()).filter(Boolean);
      const notesEn = notesEnText.split(',').map((s) => s.trim()).filter(Boolean);
      const body = {
        ...p,
        notes,
        i18n: {
          ...(p.i18n || {}),
          en: { ...(p.i18n?.en || {}), notes: notesEn },
        },
      };
      const url = isNew ? '/api/admin/perfumes' : `/api/admin/perfumes/${p.id}`;
      const r = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'Save failed');
      router.push('/admin/perfumes');
      router.refresh();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm('Delete this perfume? This cannot be undone.')) return;
    try {
      const r = await fetch(`/api/admin/perfumes/${p.id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'Delete failed');
      router.push('/admin/perfumes');
      router.refresh();
    } catch (e) { setError(e.message); }
  }

  return (
    <div>
      <header style={{ marginBottom: 28 }}>
        <Link href="/admin/perfumes" className="meta">← All perfumes</Link>
        <h1 style={ui.h1}>{isNew ? 'New Perfume' : 'Edit Perfume'}</h1>
      </header>

      <div style={ui.panel}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
          <Field label="Fragrance name">
            <input style={ui.input} value={p.fragrance} onChange={(e) => update({ fragrance: e.target.value })} placeholder="Tom Ford Oud Wood" />
          </Field>
          <Field label="House">
            <input style={ui.input} value={p.house || ''} onChange={(e) => update({ house: e.target.value })} placeholder="Tom Ford" />
          </Field>
          <Field label="Family">
            <input style={ui.input} value={p.family || ''} onChange={(e) => update({ family: e.target.value })} placeholder="Luxury Oud" />
          </Field>
        </div>

        <Field label="Key notes (comma-separated)">
          <input style={ui.input} value={notesText} onChange={(e) => setNotesText(e.target.value)} placeholder="Oud, Rosewood, Cardamom, Sandalwood" />
        </Field>

        <Field label="Blurb / description (TH)">
          <textarea style={ui.textarea} rows={4} value={p.blurb || ''} onChange={(e) => update({ blurb: e.target.value })}
            placeholder="คำอธิบายกลิ่น สถานการณ์การใช้ มู้ดของน้ำหอม…" />
        </Field>

        <Field label="Bottle image">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
            <input style={ui.input} value={p.image || ''} onChange={(e) => update({ image: e.target.value || null })} placeholder="https://… or /uploads/…" />
            <label className="btn ghost btn-sm" style={{ cursor: 'pointer' }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleUpload(e.target.files?.[0])} />
              {uploading ? 'Uploading…' : '📎 Upload image'}
            </label>
          </div>
          {p.image && (
            <div style={{ marginTop: 12 }}>
              <img src={p.image} alt="" style={{ maxHeight: 160, border: '1px solid var(--grey-5)', borderRadius: 6 }} />
            </div>
          )}
        </Field>
      </div>

      <div style={{ ...ui.panel, marginTop: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, marginBottom: 6 }}>English cache</h2>
        <p style={{ color: 'var(--grey-3)', fontSize: 12, marginBottom: 16 }}>
          Public EN mode reads this cached translation directly, so visitors do not wait for a translation API on result pages.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <Field label="Family (EN)">
            <input style={ui.input} value={p.i18n?.en?.family || ''} onChange={(e) => setI18n('en', 'family', e.target.value)} placeholder="Citrus Aromatic" />
          </Field>
          <Field label="Key notes (EN, comma-separated)">
            <input style={ui.input} value={notesEnText} onChange={(e) => setNotesEnText(e.target.value)} placeholder="Bergamot, Fig leaves, Cedar" />
          </Field>
        </div>
        <Field label="Blurb / description (EN)">
          <textarea
            style={ui.textarea}
            rows={4}
            value={p.i18n?.en?.blurb || ''}
            onChange={(e) => setI18n('en', 'blurb', e.target.value)}
            placeholder="Cached English description for bilingual result pages"
          />
        </Field>
      </div>

      <div style={{ ...ui.panel, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>DNA</h2>
            <p style={{ color: 'var(--grey-3)', fontSize: 12, marginTop: 4 }}>
              ค่า {paramConfig?.clamp?.min ?? -10} ถึง {paramConfig?.clamp?.max ?? 10} — เว้นว่างได้ (จะนับเป็น 0)
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost btn-sm" onClick={fillRandom}>🎲 Randomize</button>
            <button className="btn ghost btn-sm" onClick={clearDna}>Clear</button>
          </div>
        </div>

        <DnaGroup title="Core parameters" hint="Distance weight ×1.0" rows={allParams.core} dna={p.dna} clamp={paramConfig?.clamp} onChange={setDna} />
        <DnaGroup title="Meta parameters" hint={`Distance weight ×${paramConfig?.metaWeight ?? 0.5}`} rows={allParams.meta} dna={p.dna} clamp={paramConfig?.clamp} onChange={setDna} />
      </div>

      {error && <p style={ui.errorBox}>{error}</p>}

      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        <button className="btn btn-lg" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Confirm & Save'}</button>
        {!isNew && <button className="btn ghost btn-lg" onClick={remove}>Delete</button>}
      </div>
    </div>
  );
}

function DnaGroup({ title, hint, rows, dna, clamp, onChange }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span className="meta">{title}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-3)' }}>{hint}</span>
      </div>
      <div style={dnaGrid}>
        {rows.map((p) => (
          <div key={p.name} style={dnaCell} title={p.description || ''}>
            <div style={dnaName}>{p.label || p.name}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="range" min={clamp?.min ?? -10} max={clamp?.max ?? 10} step="1"
                value={dna?.[p.name] ?? 0}
                onChange={(e) => onChange(p.name, e.target.value)}
                style={{ flex: 1 }}
              />
              <input
                type="number" step="1"
                min={clamp?.min ?? -10} max={clamp?.max ?? 10}
                value={dna?.[p.name] ?? ''}
                onChange={(e) => onChange(p.name, e.target.value)}
                placeholder="0"
                style={{ ...ui.numInput, width: 56 }}
              />
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--grey-3)' }}>No parameters in this group — see /admin/params.</p>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={ui.label}>{label}</label>
      {children}
    </div>
  );
}

const dnaGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 8,
};
const dnaCell = {
  padding: '10px 12px', background: 'var(--offwhite)',
  border: '1px solid var(--grey-5)', borderRadius: 6,
};
const dnaName = {
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em',
  textTransform: 'uppercase', color: 'var(--ink)', marginBottom: 6,
};
