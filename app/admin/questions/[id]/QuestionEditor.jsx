'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ui } from '../../_ui';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];

export default function QuestionEditor({ initial, isNew, paramConfig }) {
  const router = useRouter();
  const [q, setQ] = useState(() => {
    // Ensure scores object exists on every choice
    const choices = (initial.choices || []).map((c) => ({ ...c, scores: c.scores || {} }));
    return { ...initial, multiSelect: !!initial.multiSelect, choices };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(null); // index of choice currently uploading

  const allParams = useMemo(() => {
    const core = (paramConfig?.core || []).map((p) => ({ ...p, group: 'core' }));
    const meta = (paramConfig?.meta || []).map((p) => ({ ...p, group: 'meta' }));
    return [...core, ...meta];
  }, [paramConfig]);

  function update(patch) { setQ((p) => ({ ...p, ...patch })); }
  function updateChoice(i, patch) {
    setQ((p) => ({ ...p, choices: p.choices.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }));
  }
  function updateScore(i, paramName, value) {
    setQ((p) => ({
      ...p,
      choices: p.choices.map((c, idx) => {
        if (idx !== i) return c;
        const scores = { ...(c.scores || {}) };
        if (value === '' || value === null) delete scores[paramName];
        else scores[paramName] = Number(value);
        return { ...c, scores };
      }),
    }));
  }
  function addChoice() {
    if (q.choices.length >= LETTERS.length) return;
    setQ((p) => ({ ...p, choices: [...p.choices, { code: LETTERS[p.choices.length], label: '', image: null, scores: {} }] }));
  }
  function removeChoice(i) {
    if (!confirm(`Remove choice ${q.choices[i]?.code}?`)) return;
    setQ((p) => ({
      ...p,
      choices: p.choices.filter((_, idx) => idx !== i)
        .map((c, idx) => ({ ...c, code: LETTERS[idx] })),
    }));
  }

  async function handleUpload(i, file) {
    if (!file) return;
    setUploading(i);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error);
      updateChoice(i, { image: d.url });
    } catch (e) { setError('Upload failed: ' + e.message); }
    finally { setUploading(null); }
  }

  async function save() {
    setSaving(true); setError('');
    try {
      const url = isNew ? '/api/admin/questions' : `/api/admin/questions/${q.id}`;
      const r = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(q),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'Save failed');
      router.push('/admin/questions');
      router.refresh();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm('Delete this question? This cannot be undone.')) return;
    try {
      const r = await fetch(`/api/admin/questions/${q.id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'Delete failed');
      router.push('/admin/questions');
      router.refresh();
    } catch (e) { setError(e.message); }
  }

  return (
    <div>
      <header style={{ marginBottom: 28 }}>
        <Link href="/admin/questions" className="meta">← All questions</Link>
        <h1 style={ui.h1}>{isNew ? 'New Question' : 'Edit Question'}</h1>
      </header>

      <div style={ui.panel}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 18 }}>
          <Field label="Order">
            <input type="number" min={1} value={q.order} onChange={(e) => update({ order: Number(e.target.value) })} style={ui.input} />
          </Field>
          <Field label="Title (TH)">
            <input type="text" value={q.title} onChange={(e) => update({ title: e.target.value })} style={ui.input} placeholder="งบประมาณของคุณ" />
          </Field>
          <Field label="Subtitle (EN)">
            <input type="text" value={q.subtitle || ''} onChange={(e) => update({ subtitle: e.target.value })} style={ui.input} placeholder="What is your budget?" />
          </Field>
        </div>
        <Field label="Question image URL (optional)">
          <input type="text" value={q.image || ''} onChange={(e) => update({ image: e.target.value || null })} style={ui.input} placeholder="https://… or /uploads/…" />
        </Field>

        <Field label="Selection mode">
          <button
            type="button"
            onClick={() => update({ multiSelect: !q.multiSelect })}
            style={{ ...ui.toggle, ...(q.multiSelect ? ui.toggleOn : {}) }}
          >
            <span style={{ width: 8, height: 8, background: q.multiSelect ? 'var(--paper)' : 'var(--grey-4)', borderRadius: 2 }} />
            {q.multiSelect ? 'Multi-select (เลือกได้หลายข้อ)' : 'Single-select (เลือกได้ 1 ข้อ)'}
          </button>
        </Field>
      </div>

      <div style={{ ...ui.panel, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>Choices</h2>
            <p style={{ color: 'var(--grey-3)', fontSize: 12, marginTop: 4 }}>
              เลขที่กรอกในแต่ละ parameter จะถูกบวกเข้า user profile ตอนเลือกข้อนั้น (เว้นว่าง = ไม่ส่งผล)
            </p>
          </div>
          <button onClick={addChoice} className="btn btn-sm" disabled={q.choices.length >= LETTERS.length}>+ Add choice</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {q.choices.map((c, i) => (
            <ChoiceCard
              key={i}
              c={c}
              i={i}
              allParams={allParams}
              onChange={(patch) => updateChoice(i, patch)}
              onScoreChange={(p, v) => updateScore(i, p, v)}
              onRemove={() => removeChoice(i)}
              onUpload={(file) => handleUpload(i, file)}
              uploading={uploading === i}
              canRemove={q.choices.length > 2}
            />
          ))}
        </div>
      </div>

      {error && <p style={ui.errorBox}>{error}</p>}

      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        <button className="btn btn-lg" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Confirm & Save'}
        </button>
        {!isNew && <button className="btn ghost btn-lg" onClick={remove}>Delete</button>}
      </div>
    </div>
  );
}

function ChoiceCard({ c, i, allParams, onChange, onScoreChange, onRemove, onUpload, uploading, canRemove }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 220px 100px', gap: 12, alignItems: 'center' }}>
        <div style={codeBadge}>{c.code}</div>
        <input
          type="text" value={c.label} onChange={(e) => onChange({ label: e.target.value })}
          style={ui.input} placeholder={`Choice ${c.code} label`}
        />
        <div>
          <input
            type="text" value={c.image || ''} onChange={(e) => onChange({ image: e.target.value || null })}
            style={ui.input} placeholder="Image URL (optional)"
          />
          <label style={smallUpload}>
            <input
              type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => onUpload(e.target.files?.[0])}
            />
            {uploading ? 'Uploading…' : '📎 upload image'}
          </label>
        </div>
        <button className="btn ghost btn-sm" onClick={onRemove} disabled={!canRemove}>Remove</button>
      </div>

      {c.image && (
        <div style={{ marginTop: 10 }}>
          <img src={c.image} alt="" style={{ maxHeight: 80, border: '1px solid var(--grey-5)', borderRadius: 6 }} />
        </div>
      )}

      {/* Per-parameter score grid */}
      <div style={{ marginTop: 14 }}>
        <div className="meta" style={{ marginBottom: 8 }}>Score deltas (clamped after summing all answers)</div>
        <div style={scoreGrid}>
          {allParams.map((p) => (
            <label key={p.name} style={scoreCell} title={p.description || p.name}>
              <span style={{ ...scoreLabel, color: p.group === 'meta' ? 'var(--grey-2)' : 'var(--ink)' }}>
                {p.label || p.name}
                {p.group === 'meta' && <em style={{ fontStyle: 'normal', marginLeft: 4, opacity: .6 }}>·meta</em>}
              </span>
              <input
                type="number" step="1"
                value={c.scores?.[p.name] ?? ''}
                onChange={(e) => onScoreChange(p.name, e.target.value)}
                placeholder="0"
                style={ui.numInput}
              />
            </label>
          ))}
          {allParams.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--grey-3)' }}>
              ยังไม่มี parameters — ไปที่ <a href="/admin/params">/admin/params</a> เพื่อเพิ่มก่อน
            </p>
          )}
        </div>
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

const cardStyle = {
  padding: 18, border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-md)', background: 'var(--offwhite)',
};
const codeBadge = {
  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'var(--font-mono)', fontSize: 13,
  border: '1px solid var(--ink)', background: 'var(--ink)', color: 'var(--paper)',
  borderRadius: 'var(--radius-pill)',
};
const smallUpload = {
  display: 'inline-block', marginTop: 6,
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.15em',
  textTransform: 'uppercase', color: 'var(--grey-2)', cursor: 'pointer',
};
const scoreGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 8,
};
const scoreCell = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '6px 10px', background: 'var(--paper)', border: '1px solid var(--grey-5)',
  borderRadius: 6,
};
const scoreLabel = {
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em',
  textTransform: 'uppercase',
};
