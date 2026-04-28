'use client';

import { useState } from 'react';
import { ui } from '../_ui';

/**
 * CopyEditor — generic editor over the site_copy JSON tree.
 *
 * Section ordering and field labels are driven by SECTIONS below — adding a
 * new copy key to /data/copy.json + listing it here is the only step needed
 * to expose it in the admin UI.
 *
 * Save path: PUT /api/admin/copy with the entire merged object. Defaults
 * come from /data/copy.json so any field left blank still falls back.
 */

const SECTIONS = [
  {
    id: 'home', label: 'Home — Hero',
    fields: [
      { path: 'home.title',         label: 'Headline',     hint: 'The big italic line in the hero' },
      { path: 'home.lead',          label: 'Lead paragraph', long: true, hint: 'Below the headline' },
      { path: 'home.ctaPrimary',    label: 'Primary CTA',  hint: 'Main button label' },
      { path: 'home.ctaSecondary',  label: 'Secondary CTA', hint: 'Ghost-button label' },
    ],
  },
  {
    id: 'method', label: 'Home — Method',
    fields: [
      { path: 'method.eyebrow',  label: 'Eyebrow',  hint: 'Small label above heading' },
      { path: 'method.title',    label: 'Heading' },
      { path: 'method.cta',      label: 'CTA button' },
    ],
    list: { path: 'method.steps', label: 'Steps', maxItems: 6, fields: [
      { path: 'title', label: 'Step title' },
      { path: 'body',  label: 'Step body',  long: true },
    ]},
  },
  {
    id: 'about', label: 'Home — About',
    fields: [
      { path: 'about.eyebrow', label: 'Eyebrow' },
      { path: 'about.title',   label: 'Heading',  long: true },
      { path: 'about.lead',    label: 'Lead paragraph', long: true },
      { path: 'about.cta',     label: 'CTA button' },
    ],
  },
  {
    id: 'quiz_username', label: 'Quiz — Username step',
    fields: [
      { path: 'quiz.username.eyebrow',     label: 'Eyebrow' },
      { path: 'quiz.username.titleA',      label: 'Headline (line 1)' },
      { path: 'quiz.username.titleB',      label: 'Headline (line 2, italic)' },
      { path: 'quiz.username.body',        label: 'Body', long: true },
      { path: 'quiz.username.placeholder', label: 'Input placeholder' },
      { path: 'quiz.username.cta',         label: 'CTA button' },
      { path: 'quiz.username.missing',     label: 'Hint when name empty' },
    ],
  },
  {
    id: 'quiz_email', label: 'Quiz — Email step',
    fields: [
      { path: 'quiz.email.eyebrow',           label: 'Eyebrow' },
      { path: 'quiz.email.titleA',            label: 'Headline (line 1)' },
      { path: 'quiz.email.titleB',            label: 'Headline (line 2, italic)' },
      { path: 'quiz.email.body',              label: 'Body', long: true },
      { path: 'quiz.email.placeholder',       label: 'Input placeholder' },
      { path: 'quiz.email.ctaSubmit',         label: 'Send button' },
      { path: 'quiz.email.ctaSkip',           label: 'Skip button' },
      { path: 'quiz.email.skipNote.eyebrow',  label: 'Skip note — eyebrow' },
      { path: 'quiz.email.skipNote.body',     label: 'Skip note — body', long: true },
      { path: 'quiz.email.backLabel',         label: 'Back-link label' },
    ],
  },
  {
    id: 'quiz_misc', label: 'Quiz — States',
    fields: [
      { path: 'quiz.computing.eyebrow', label: 'Computing — eyebrow' },
      { path: 'quiz.computing.title',   label: 'Computing — heading' },
      { path: 'quiz.empty.eyebrow',     label: 'Empty quiz — eyebrow' },
      { path: 'quiz.empty.title',       label: 'Empty quiz — heading' },
      { path: 'quiz.empty.body',        label: 'Empty quiz — body', long: true },
    ],
  },
  {
    id: 'result', label: 'Result page',
    fields: [
      { path: 'result.eyebrowPrefix', label: 'Eyebrow prefix', hint: '"Your Match · Pattern " then the pattern' },
      { path: 'result.titleLine1',    label: 'Title line 1', hint: 'Line above the italic fragrance name' },
      { path: 'result.actions.again', label: 'Take it again button' },
      { path: 'result.actions.home',  label: 'Back to home button' },
      { path: 'result.alternatives.eyebrow', label: 'Alternatives — eyebrow' },
      { path: 'result.alternatives.title',   label: 'Alternatives — title' },
      { path: 'result.specialEyebrow', label: 'Easter egg — eyebrow' },
    ],
  },
];

export default function CopyEditor({ initial, defaults }) {
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  function setPath(path, value) {
    setData((prev) => writePath(prev, path, value));
  }

  function resetToDefault(path) {
    setData((prev) => writePath(prev, path, readPath(defaults, path)));
  }

  function resetAll() {
    if (!confirm('Reset every field back to the /data/copy.json defaults? Unsaved changes are lost.')) return;
    setData(deepClone(defaults));
    setMsg({ kind: 'info', text: 'Reverted to defaults — click Save to persist.' });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch('/api/admin/copy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'Save failed');
      setMsg({ kind: 'ok', text: 'Saved. Public pages reflect the changes on next reload.' });
    } catch (e) {
      setMsg({ kind: 'err', text: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <span className="meta">Site copy</span>
          <h1 style={ui.h1}>Static pages CMS</h1>
          <p style={{ color: 'var(--grey-2)', marginTop: 4, fontSize: 14 }}>
            แก้ headline / paragraph / ปุ่มต่าง ๆ บนหน้า public ทั้งหมด — กด Save แล้วรีโหลดหน้าเว็บเพื่อดูผล
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn ghost" type="button" onClick={resetAll}>Reset all</button>
          <button className="btn" type="button" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </header>

      {msg && (
        <div style={msg.kind === 'err' ? ui.errorBox : msg.kind === 'ok' ? ui.okBox : { marginBottom: 12, fontSize: 13, color: 'var(--grey-2)' }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} style={pill}>{s.label}</a>
        ))}
      </div>

      {SECTIONS.map((sec) => (
        <section key={sec.id} id={sec.id} style={{ ...ui.panel, marginBottom: 24 }}>
          <h2 style={h2}>{sec.label}</h2>

          {sec.fields.map((f) => (
            <Field
              key={f.path}
              path={f.path}
              label={f.label}
              hint={f.hint}
              long={f.long}
              value={readPath(data, f.path) ?? ''}
              defaultValue={readPath(defaults, f.path) ?? ''}
              onChange={(v) => setPath(f.path, v)}
              onReset={() => resetToDefault(f.path)}
            />
          ))}

          {sec.list && (
            <ListEditor
              spec={sec.list}
              value={readPath(data, sec.list.path) || []}
              defaults={readPath(defaults, sec.list.path) || []}
              onChange={(v) => setPath(sec.list.path, v)}
            />
          )}
        </section>
      ))}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button className="btn" type="button" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------

function Field({ path, label, hint, long, value, defaultValue, onChange, onReset }) {
  const isOverridden = value !== defaultValue;
  return (
    <div style={ui.fieldset}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <label style={ui.label}>{label}</label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isOverridden && <span style={editedTag}>edited</span>}
          {isOverridden && (
            <button type="button" onClick={onReset} style={resetBtn}>reset</button>
          )}
          <span style={pathTag}>{path}</span>
        </div>
      </div>
      {long ? (
        <textarea
          style={{ ...ui.textarea, minHeight: 70 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={Math.min(6, Math.max(2, Math.ceil((value?.length || 0) / 80)))}
        />
      ) : (
        <input
          type="text"
          style={ui.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && <div style={{ color: 'var(--grey-3)', fontSize: 11, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function ListEditor({ spec, value, defaults, onChange }) {
  const items = Array.isArray(value) ? value : [];

  function update(i, key, v) {
    const next = items.map((item, idx) => idx === i ? { ...item, [key]: v } : item);
    onChange(next);
  }
  function add() {
    if (items.length >= (spec.maxItems || 99)) return;
    // Use the next default as a template if available
    const tpl = defaults[items.length] || Object.fromEntries(spec.fields.map((f) => [f.path, '']));
    onChange([...items, tpl]);
  }
  function remove(i) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={ui.label}>{spec.label} ({items.length})</div>
        <button type="button" className="btn ghost btn-sm" onClick={add} disabled={items.length >= (spec.maxItems || 99)}>
          + Add item
        </button>
      </div>
      {items.map((item, i) => (
        <div key={i} style={listCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={pathTag}>#{i + 1}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => move(i, -1)} style={miniBtn} disabled={i === 0}>↑</button>
              <button type="button" onClick={() => move(i, +1)} style={miniBtn} disabled={i === items.length - 1}>↓</button>
              <button type="button" onClick={() => remove(i)} style={{ ...miniBtn, color: '#b00020' }}>×</button>
            </div>
          </div>
          {spec.fields.map((f) => (
            <Field
              key={f.path}
              path={`${spec.path}[${i}].${f.path}`}
              label={f.label}
              long={f.long}
              value={item[f.path] ?? ''}
              defaultValue={(defaults[i] || {})[f.path] ?? ''}
              onChange={(v) => update(i, f.path, v)}
              onReset={() => update(i, f.path, (defaults[i] || {})[f.path] ?? '')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------- helpers ----------------------------------------------------------

function readPath(obj, path) {
  if (!obj) return undefined;
  return path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}
function writePath(obj, path, value) {
  const keys = path.split('.');
  const next = deepClone(obj || {});
  let cur = next;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] == null || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
  return next;
}
function deepClone(x) {
  return JSON.parse(JSON.stringify(x ?? {}));
}

// ---------- styles ----------------------------------------------------------

const h2 = { fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, marginBottom: 18 };
const pill = {
  padding: '6px 12px',
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.18em',
  textTransform: 'uppercase',
  border: '1px solid var(--grey-5)', borderRadius: 999,
  color: 'var(--grey-2)', textDecoration: 'none',
};
const pathTag = {
  fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-3)',
};
const editedTag = {
  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.18em',
  textTransform: 'uppercase', padding: '1px 7px',
  background: 'var(--ink)', color: 'var(--paper)', borderRadius: 999,
};
const resetBtn = {
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.15em',
  textTransform: 'uppercase', background: 'transparent',
  border: '1px solid var(--grey-5)', borderRadius: 999,
  padding: '2px 8px', cursor: 'pointer', color: 'var(--grey-2)',
};
const listCard = {
  background: 'var(--offwhite)', border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 12,
};
const miniBtn = {
  fontFamily: 'var(--font-mono)', fontSize: 12,
  background: 'var(--paper)', border: '1px solid var(--grey-5)',
  borderRadius: 4, padding: '2px 8px', cursor: 'pointer',
};
