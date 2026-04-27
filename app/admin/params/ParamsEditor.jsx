'use client';

import { useState } from 'react';
import { ui } from '../_ui';

const blank = () => ({ name: '', label: '', description: '' });

export default function ParamsEditor({ initial }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(initial)));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  function update(patch) { setDraft((p) => ({ ...p, ...patch })); }
  function updateAxis(group, i, patch) {
    setDraft((p) => ({ ...p, [group]: p[group].map((a, idx) => idx === i ? { ...a, ...patch } : a) }));
  }
  function addAxis(group) {
    setDraft((p) => ({ ...p, [group]: [...p[group], blank()] }));
  }
  function removeAxis(group, i) {
    setDraft((p) => ({ ...p, [group]: p[group].filter((_, idx) => idx !== i) }));
  }

  async function save() {
    // Sanity check: every axis needs a non-empty name; names must be unique across core+meta.
    const all = [...(draft.core || []), ...(draft.meta || [])];
    const names = all.map((a) => (a.name || '').trim());
    if (names.some((n) => !n)) { setErr('Every parameter needs a name (e.g. "Masculine").'); return; }
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) { setErr(`Duplicate parameter name: ${dup}`); return; }

    setErr(''); setMsg(''); setSaving(true);
    try {
      const r = await fetch('/api/admin/params', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metaWeight: Number(draft.metaWeight) || 0.5,
          clamp: { min: Number(draft.clamp?.min) || -10, max: Number(draft.clamp?.max) || 10 },
          core: draft.core.map((a) => ({ name: a.name.trim(), label: a.label || a.name, description: a.description || '' })),
          meta: draft.meta.map((a) => ({ name: a.name.trim(), label: a.label || a.name, description: a.description || '' })),
        }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'Save failed');
      setDraft(d.params);
      setMsg('Saved · the new parameters are now live for scoring.');
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <header style={ui.pageHead}>
        <span className="meta">Settings</span>
        <h1 style={ui.h1}>Parameters</h1>
        <p style={{ color: 'var(--grey-2)', marginTop: 8, fontSize: 14, maxWidth: 720 }}>
          แกนคะแนน CORE และ META ใช้สำหรับเทียบกับ DNA ของน้ำหอม — เพิ่ม/ลบ/แก้ชื่อได้ตามใจ
          (ทุก choice score และทุก perfume DNA ที่ใช้ชื่อแกนเดิมจะยังคงอ่านได้, แกนที่ลบไปแล้วจะไม่ถูกใช้คำนวณ)
        </p>
      </header>

      <div style={ui.panel}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div>
            <label style={ui.label}>Meta weight</label>
            <input type="number" step="0.05" min={0} max={1}
              value={draft.metaWeight}
              onChange={(e) => update({ metaWeight: Number(e.target.value) })}
              style={ui.input}
            />
            <small style={{ color: 'var(--grey-3)', fontSize: 11 }}>0.5 = META axes count half as much as CORE</small>
          </div>
          <div>
            <label style={ui.label}>Clamp min</label>
            <input type="number" value={draft.clamp?.min ?? -10}
              onChange={(e) => update({ clamp: { ...draft.clamp, min: Number(e.target.value) } })}
              style={ui.input}
            />
          </div>
          <div>
            <label style={ui.label}>Clamp max</label>
            <input type="number" value={draft.clamp?.max ?? 10}
              onChange={(e) => update({ clamp: { ...draft.clamp, max: Number(e.target.value) } })}
              style={ui.input}
            />
          </div>
        </div>
      </div>

      <ParamGroup
        title="Core parameters"
        subtitle="Distance weight ×1.0 — แกนหลักที่ส่งผลต่อการแมตช์มากที่สุด"
        group="core"
        rows={draft.core || []}
        onUpdate={(i, patch) => updateAxis('core', i, patch)}
        onAdd={() => addAxis('core')}
        onRemove={(i) => removeAxis('core', i)}
      />
      <ParamGroup
        title="Meta parameters"
        subtitle={`Distance weight ×${draft.metaWeight} — แกนเสริม (mood, vibe)`}
        group="meta"
        rows={draft.meta || []}
        onUpdate={(i, patch) => updateAxis('meta', i, patch)}
        onAdd={() => addAxis('meta')}
        onRemove={(i) => removeAxis('meta', i)}
      />

      {err && <p style={ui.errorBox}>{err}</p>}
      {msg && <p style={ui.okBox}>{msg}</p>}

      <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
        <button className="btn btn-lg" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Confirm & Save'}
        </button>
        <button className="btn ghost btn-lg" onClick={() => setDraft(JSON.parse(JSON.stringify(initial)))}>
          Reset
        </button>
      </div>
    </div>
  );
}

function ParamGroup({ title, subtitle, rows, onUpdate, onAdd, onRemove }) {
  return (
    <div style={{ ...ui.panel, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>{title}</h2>
          <p style={{ color: 'var(--grey-3)', fontSize: 12, marginTop: 4 }}>{subtitle}</p>
        </div>
        <button onClick={onAdd} className="btn btn-sm">+ Add parameter</button>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ ...rowHead, display: 'grid', gridTemplateColumns: '32px 1fr 1fr 2fr 90px', gap: 12 }}>
          <div>#</div><div>Name (key)</div><div>Label</div><div>Description</div><div></div>
        </div>
        {rows.map((a, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 2fr 90px', gap: 12, alignItems: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grey-3)' }}>{String(i + 1).padStart(2, '0')}</div>
            <input style={ui.input} value={a.name || ''} onChange={(e) => onUpdate(i, { name: e.target.value })} placeholder="Masculine" />
            <input style={ui.input} value={a.label || ''} onChange={(e) => onUpdate(i, { label: e.target.value })} placeholder="Masculine" />
            <input style={ui.input} value={a.description || ''} onChange={(e) => onUpdate(i, { description: e.target.value })} placeholder="+ ผู้ใหญ่ / − เด็ก" />
            <button className="btn ghost btn-sm" onClick={() => onRemove(i)}>Remove</button>
          </div>
        ))}
        {rows.length === 0 && <p style={{ color: 'var(--grey-3)', fontSize: 13 }}>No parameters yet — click <em>Add parameter</em>.</p>}
      </div>
    </div>
  );
}

const rowHead = {
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.18em',
  textTransform: 'uppercase', color: 'var(--grey-3)', paddingBottom: 6,
};
