'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ui } from '../../_ui';

export default function EggEditor({ initial, isNew, questions }) {
  const router = useRouter();
  const [r, setR] = useState(() => ({
    type: initial.type || initial.constraints?.__type || 'quiz',
    ...initial,
    constraints: { ...(initial.constraints || {}) },
    result: { ...(initial.result || {}) },
  }));
  const [notesText, setNotesText] = useState(() => (initial.result?.notes || []).join(', '));
  const [triggersText, setTriggersText] = useState(() => (initial.constraints?.triggers || []).join('\n'));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function update(patch) { setR((p) => ({ ...p, ...patch })); }
  function setConstraint(qid, code) {
    setR((p) => {
      const constraints = { ...p.constraints };
      if (!code) delete constraints[qid];
      else constraints[qid] = code;
      return { ...p, constraints };
    });
  }
  function setResultField(field, val) {
    setR((p) => ({ ...p, result: { ...p.result, [field]: val } }));
  }

  async function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error);
      setResultField('image', d.url);
    } catch (e) { setError('Upload failed: ' + e.message); }
    finally { setUploading(false); }
  }

  async function save() {
    if (!r.label?.trim()) { setError('Label required (จะแสดงในตารางให้คุณจำได้)'); return; }
    if (!r.result?.fragrance?.trim()) { setError('Result fragrance required (ข้อความ/ชื่อที่จะแสดงให้ผู้ใช้)'); return; }
    const type = r.type || 'quiz';
    const triggers = triggersText.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
    if (type === 'quiz') {
      const hasAtLeastOne = Object.values(r.constraints || {}).some((v) => !!v);
      if (!hasAtLeastOne) { setError('ต้องตั้งเงื่อนไขอย่างน้อย 1 ข้อ (ไม่งั้น rule นี้จะ fire กับทุก quiz)'); return; }
    }
    if (type === 'puzzle' && triggers.length === 0) {
      setError('Puzzle ต้องมี trigger อย่างน้อย 1 ค่า เช่น about.cta, cta:Find my match หรือ *');
      return;
    }

    setSaving(true); setError('');
    try {
      const notes = notesText.split(',').map((s) => s.trim()).filter(Boolean);
      const constraints = type === 'puzzle'
        ? { path: r.constraints?.path || '', triggers }
        : { ...(r.constraints || {}) };
      const body = {
        ...r,
        type,
        priority: Number(r.priority) || 0,
        constraints,
        result: { ...r.result, notes },
      };
      const url = isNew ? '/api/admin/easter-eggs' : `/api/admin/easter-eggs/${r.id}`;
      const resp = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await resp.json();
      if (!d.ok) throw new Error(d.error || 'Save failed');
      router.push('/admin/easter-eggs');
      router.refresh();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm('Delete this easter-egg rule?')) return;
    try {
      const resp = await fetch(`/api/admin/easter-eggs/${r.id}`, { method: 'DELETE' });
      const d = await resp.json();
      if (!d.ok) throw new Error(d.error || 'Delete failed');
      router.push('/admin/easter-eggs');
      router.refresh();
    } catch (e) { setError(e.message); }
  }

  return (
    <div>
      <header style={{ marginBottom: 28 }}>
        <Link href="/admin/easter-eggs" className="meta">← All easter eggs</Link>
        <h1 style={ui.h1}>{isNew ? 'New Easter Egg' : 'Edit Easter Egg'}</h1>
      </header>

      <div style={ui.panel}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 18 }}>
          <Field label="Label (admin only)">
            <input style={ui.input} value={r.label} onChange={(e) => update({ label: e.target.value })} placeholder="เบียว + vangard → roll-on" />
          </Field>
          <Field label="Type">
            <select style={ui.select} value={r.type || 'quiz'} onChange={(e) => update({ type: e.target.value })}>
              <option value="quiz">Quiz result</option>
              <option value="puzzle">Puzzle popup</option>
            </select>
          </Field>
          <Field label="Priority">
            <input type="number" style={ui.input} value={r.priority ?? 100} onChange={(e) => update({ priority: Number(e.target.value) })} />
          </Field>
          <Field label="Status">
            <button
              type="button"
              onClick={() => update({ enabled: !r.enabled })}
              style={{ ...ui.toggle, ...(r.enabled ? ui.toggleOn : {}) }}
            >
              {r.enabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </Field>
        </div>
      </div>

      {r.type === 'puzzle' ? (
        <div style={{ ...ui.panel, marginTop: 16 }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, marginBottom: 6 }}>Puzzle triggers</h2>
          <p style={{ color: 'var(--grey-3)', fontSize: 12, marginBottom: 16 }}>
            Trigger ได้จากปุ่ม/ลิงก์ CTA ทุกจุดของเว็บ เช่น <code>about.cta</code>, <code>cta:Find my match</code>, <code>nav:About</code>, <code>/quiz</code> หรือ <code>*</code>
          </p>
          <Field label="Page path (optional)">
            <input style={ui.input} value={r.constraints?.path || ''} onChange={(e) => setR((p) => ({ ...p, constraints: { ...(p.constraints || {}), path: e.target.value } }))} placeholder="/, /quiz, /result or *" />
          </Field>
          <Field label="Triggers (one per line)">
            <textarea style={ui.textarea} rows={5} value={triggersText} onChange={(e) => setTriggersText(e.target.value)} placeholder={"about.cta\nhome.ctaSecondary\ncta:Begin the dip"} />
          </Field>
        </div>
      ) : (
        <div style={{ ...ui.panel, marginTop: 16 }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, marginBottom: 6 }}>Constraints</h2>
          <p style={{ color: 'var(--grey-3)', fontSize: 12, marginBottom: 16 }}>
            เลือก choice ที่ต้องตอบในแต่ละข้อ — ปล่อย <em>(any)</em> ไว้ถ้าข้อนั้นเป็น wildcard
          </p>

          <div style={{ display: 'grid', gap: 12 }}>
            {questions.length === 0 && (
              <p style={{ color: 'var(--grey-3)', fontSize: 13 }}>
                ยังไม่มีคำถาม — สร้างที่ <a href="/admin/questions">/admin/questions</a> ก่อน
              </p>
            )}
            {questions.map((q) => (
              <div key={q.id} style={constraintRow}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-3)', letterSpacing: '.18em' }}>Q{q.order} · {q.id}</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, marginTop: 2 }}>{q.title}</div>
                </div>
                <select
                  value={r.constraints?.[q.id] || ''}
                  onChange={(e) => setConstraint(q.id, e.target.value || null)}
                  style={ui.select}
                >
                  <option value="">— (any / wildcard)</option>
                  {q.choices.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {c.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result payload */}
      <div style={{ ...ui.panel, marginTop: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, marginBottom: 16 }}>Result</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 18 }}>
          <Field label="Fragrance / headline">
            <input style={ui.input} value={r.result?.fragrance || ''} onChange={(e) => setResultField('fragrance', e.target.value)} placeholder="แนะนำให้เริ่มจากโรลออนก่อน 😅" />
          </Field>
          <Field label="House (optional)">
            <input style={ui.input} value={r.result?.house || ''} onChange={(e) => setResultField('house', e.target.value || null)} />
          </Field>
          <Field label="Family">
            <input style={ui.input} value={r.result?.family || ''} onChange={(e) => setResultField('family', e.target.value)} placeholder="Easter Egg" />
          </Field>
        </div>

        {r.type === 'puzzle' && (
          <Field label="Unlock popup title">
            <input style={ui.input} value={r.result?.unlockTitle || ''} onChange={(e) => setResultField('unlockTitle', e.target.value)} placeholder={'ยินดีด้วย คุณปลดล็อค "คนเฟรนลี่ชอบเมคเฟรน"'} />
          </Field>
        )}

        <Field label="Notes (comma-separated, optional)">
          <input style={ui.input} value={notesText} onChange={(e) => setNotesText(e.target.value)} placeholder="" />
        </Field>

        <Field label="Blurb / description">
          <textarea style={ui.textarea} rows={4} value={r.result?.blurb || ''} onChange={(e) => setResultField('blurb', e.target.value)} />
        </Field>

        <Field label="Image">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
            <input style={ui.input} value={r.result?.image || ''} onChange={(e) => setResultField('image', e.target.value || null)} placeholder="https://… or /uploads/…" />
            <label className="btn ghost btn-sm" style={{ cursor: 'pointer' }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleUpload(e.target.files?.[0])} />
              {uploading ? 'Uploading…' : '📎 Upload'}
            </label>
          </div>
          {r.result?.image && (
            <div style={{ marginTop: 12 }}>
              <img src={r.result.image} alt="" style={{ maxHeight: 140, border: '1px solid var(--grey-5)', borderRadius: 6 }} />
            </div>
          )}
        </Field>
      </div>

      {error && <p style={ui.errorBox}>{error}</p>}

      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        <button className="btn btn-lg" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Confirm & Save'}</button>
        {!isNew && <button className="btn ghost btn-lg" onClick={remove}>Delete</button>}
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

const constraintRow = {
  display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'center',
  padding: '12px 14px', background: 'var(--offwhite)',
  border: '1px solid var(--grey-5)', borderRadius: 6,
};
