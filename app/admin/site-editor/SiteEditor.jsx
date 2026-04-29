'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * SiteEditor — split-pane visual editor.
 *
 *   ┌──────────────┬────────────────────────┐
 *   │ Tabs +       │  Live iframe           │
 *   │ side-panel   │  /?preview=1           │
 *   │ controls     │  /quiz?preview=1       │
 *   │              │  /result?preview=1     │
 *   └──────────────┴────────────────────────┘
 *
 * Theme changes (colour / font) push to the iframe via postMessage and
 * apply instantly via PreviewBridge — no DB writes. Text edits stay in
 * the side panel until Save.
 *
 * The Save button is the ONLY way changes hit the DB, per spec
 * ("ต้องมี การ save edit ก่อน… ไม่ต้องทำ ระบบ auto save").
 */

// ---- Tab definitions (3 main pages) ----
const TABS = [
  {
    id: 'home',
    label: 'Home',
    src:   '/?preview=1',
    description: 'หน้าแรก — Hero / Method / About',
    textFields: [
      { path: 'home.title',         label: 'Hero headline' },
      { path: 'home.lead',          label: 'Hero lead', long: true },
      { path: 'home.ctaPrimary',    label: 'Primary CTA' },
      { path: 'home.ctaSecondary',  label: 'Secondary CTA' },
      { path: 'method.eyebrow',     label: 'Method eyebrow' },
      { path: 'method.title',       label: 'Method heading' },
      { path: 'method.cta',         label: 'Method CTA' },
      { path: 'about.eyebrow',      label: 'About eyebrow' },
      { path: 'about.title',        label: 'About heading', long: true },
      { path: 'about.lead',         label: 'About lead', long: true },
      { path: 'about.cta',          label: 'About CTA' },
    ],
  },
  {
    id: 'quiz',
    label: 'Quiz',
    src:   '/quiz?preview=1',
    description: 'หน้าทำแบบสอบถาม — apply ทุกคำถาม',
    textFields: [
      { path: 'quiz.username.eyebrow',     label: 'Username — eyebrow' },
      { path: 'quiz.username.titleA',      label: 'Username — line 1' },
      { path: 'quiz.username.titleB',      label: 'Username — line 2 (italic)' },
      { path: 'quiz.username.body',        label: 'Username — body', long: true },
      { path: 'quiz.username.placeholder', label: 'Username — input placeholder' },
      { path: 'quiz.username.cta',         label: 'Username — CTA' },
      { path: 'quiz.email.eyebrow',        label: 'Email — eyebrow' },
      { path: 'quiz.email.titleA',         label: 'Email — line 1' },
      { path: 'quiz.email.titleB',         label: 'Email — line 2 (italic)' },
      { path: 'quiz.email.body',           label: 'Email — body', long: true },
      { path: 'quiz.email.ctaSubmit',      label: 'Email — Send button' },
      { path: 'quiz.email.ctaSkip',        label: 'Email — Skip button' },
      { path: 'quiz.computing.eyebrow',    label: 'Computing — eyebrow' },
      { path: 'quiz.computing.title',      label: 'Computing — heading' },
    ],
  },
  {
    id: 'result',
    label: 'Result',
    src:   '/result?preview=1',
    description: 'หน้าผลลัพธ์ — แสดงน้ำหอมที่จับคู่',
    textFields: [
      { path: 'result.eyebrowPrefix',       label: 'Eyebrow prefix' },
      { path: 'result.titleLine1',          label: 'Title line 1' },
      { path: 'result.actions.again',       label: 'Take it again button' },
      { path: 'result.actions.home',        label: 'Back to home button' },
      { path: 'result.alternatives.eyebrow', label: 'Alternatives — eyebrow' },
      { path: 'result.alternatives.title',  label: 'Alternatives — title' },
      { path: 'result.specialEyebrow',      label: 'Easter egg eyebrow' },
    ],
  },
];

// ---- Theme schema (drives the colour-picker form) ----
const THEME_FIELDS = [
  { key: 'ink',      label: 'Ink (text)',         kind: 'color' },
  { key: 'paper',    label: 'Paper (background)', kind: 'color' },
  { key: 'offwhite', label: 'Off-white panels',   kind: 'color' },
  { key: 'grey5',    label: 'Border / divider',   kind: 'color' },
  { key: 'grey3',    label: 'Muted text',         kind: 'color' },
  { key: 'grey2',    label: 'Secondary text',     kind: 'color' },
  { key: 'fontSerif', label: 'Serif font stack',  kind: 'font' },
  { key: 'fontSans',  label: 'Sans font stack',   kind: 'font' },
  { key: 'fontMono',  label: 'Mono font stack',   kind: 'font' },
];

const FONT_PRESETS = {
  serif: [
    "'Cormorant Garamond', Georgia, serif",
    "'Playfair Display', Georgia, serif",
    "'Italiana', serif",
    "Georgia, 'Times New Roman', serif",
  ],
  sans: [
    "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    "'Helvetica Neue', Helvetica, Arial, sans-serif",
    "'system-ui', sans-serif",
  ],
  mono: [
    "'JetBrains Mono', ui-monospace, monospace",
    "'Fira Code', ui-monospace, monospace",
    "'Courier New', monospace",
  ],
};

export default function SiteEditor({ initial, defaults }) {
  const [draft, setDraft] = useState(() => deepClone(initial));
  const [tab, setTab]       = useState('home');
  const [editMode, setEdit] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState(null);
  const [iframeReady, setIframeReady] = useState(false);
  const iframeRef = useRef(null);

  const tabDef = TABS.find((t) => t.id === tab) || TABS[0];

  // Push theme to the iframe whenever the draft theme changes (only after
  // PreviewBridge says it's ready, so we don't lose the first push).
  useEffect(() => {
    if (!iframeReady) return;
    pushTheme(iframeRef.current, draft.theme || {});
  }, [iframeReady, draft.theme]);

  // Listen for the iframe's "ready" handshake.
  useEffect(() => {
    function onMessage(ev) {
      if (ev.origin !== window.location.origin) return;
      if (ev.data?.type === 'blot-preview-ready') {
        setIframeReady(true);
        // Push the current theme on (re)load.
        pushTheme(iframeRef.current, draft.theme || {});
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // Intentionally only-on-mount: we read draft.theme via closure and
    // re-push happens via a separate effect below.
  }, []); // eslint-disable-line

  // When tab switches, the iframe will reload — reset the ready flag so
  // the post-load handshake can fire again.
  function onSelectTab(id) {
    if (id === tab) return;
    setIframeReady(false);
    setTab(id);
  }

  function setTheme(key, value) {
    setDraft((prev) => ({ ...prev, theme: { ...(prev.theme || {}), [key]: value } }));
  }

  function setText(path, value) {
    setDraft((prev) => writePath(prev, path, value));
  }

  function discard() {
    if (!confirm('ทิ้งการแก้ไขทั้งหมดที่ยังไม่ได้ Save?')) return;
    setDraft(deepClone(initial));
    setMsg({ kind: 'info', text: 'Reverted draft to last saved state.' });
  }

  function resetTheme() {
    if (!confirm('Reset ธีมสีและฟอนต์กลับไปเป็นค่า default?')) return;
    setDraft((prev) => ({ ...prev, theme: deepClone(defaults.theme || {}) }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch('/api/admin/copy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'Save failed');
      // Reload the iframe so server-rendered text edits appear too.
      reloadIframe(iframeRef.current);
      setMsg({ kind: 'ok', text: 'Saved · live site updated.' });
    } catch (e) {
      setMsg({ kind: 'err', text: e.message });
    } finally {
      setSaving(false);
    }
  }

  // The iframe key is part src + part "reload nonce" so save() can force
  // a clean reload to pick up freshly-saved server-rendered text.
  const [reloadNonce, setReloadNonce] = useState(0);
  function reloadIframe() { setIframeReady(false); setReloadNonce((n) => n + 1); }

  return (
    <div style={layout}>
      {/* ---- Top bar ---------------------------------------------- */}
      <header style={topBar}>
        <div>
          <span className="meta">Site editor</span>
          <h1 style={h1}>Visual preview &amp; theme</h1>
          <p style={{ color: 'var(--grey-2)', fontSize: 13, marginTop: 4 }}>
            แก้ไขสี / ฟอนต์ / ข้อความ แล้วกด <strong>Save</strong> เพื่อ deploy ไปหน้า public — ไม่มี auto-save
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={toggleWrap}>
            <input
              type="checkbox"
              checked={editMode}
              onChange={(e) => setEdit(e.target.checked)}
              style={{ accentColor: 'var(--ink)' }}
            />
            <span>Edit mode</span>
          </label>
          <button className="btn ghost" type="button" onClick={discard} disabled={saving}>
            Discard
          </button>
          <button className="btn" type="button" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </header>

      {msg && (
        <div style={msg.kind === 'err' ? errBox : msg.kind === 'ok' ? okBox : infoBox}>
          {msg.text}
        </div>
      )}

      {/* ---- Tabs ------------------------------------------------ */}
      <nav style={tabBar}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelectTab(t.id)}
            style={{ ...tabBtn, ...(tab === t.id ? tabBtnActive : null) }}
          >
            {t.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--grey-3)' }}>
          {tabDef.description}
        </span>
      </nav>

      {/* ---- Split pane ----------------------------------------- */}
      <div style={split}>
        {/* Left: form panel — only when edit mode is on */}
        {editMode && (
          <aside style={panel}>
            <Section title="Theme · colours">
              {THEME_FIELDS.filter((f) => f.kind === 'color').map((f) => (
                <ColorRow
                  key={f.key}
                  label={f.label}
                  value={draft.theme?.[f.key] || ''}
                  onChange={(v) => setTheme(f.key, v)}
                  onReset={() => setTheme(f.key, defaults.theme?.[f.key] || '')}
                />
              ))}
            </Section>

            <Section title="Theme · typography">
              {THEME_FIELDS.filter((f) => f.kind === 'font').map((f) => {
                const presetKey = f.key === 'fontSerif' ? 'serif' : f.key === 'fontMono' ? 'mono' : 'sans';
                return (
                  <FontRow
                    key={f.key}
                    label={f.label}
                    value={draft.theme?.[f.key] || ''}
                    onChange={(v) => setTheme(f.key, v)}
                    onReset={() => setTheme(f.key, defaults.theme?.[f.key] || '')}
                    presets={FONT_PRESETS[presetKey]}
                  />
                );
              })}
              <button type="button" onClick={resetTheme} style={resetBtn}>
                ↺ Reset all theme to defaults
              </button>
            </Section>

            <Section title={`Text · ${tabDef.label}`}>
              <p style={{ fontSize: 12, color: 'var(--grey-3)', marginBottom: 10 }}>
                ข้อความเป็น server-rendered — กด Save แล้วหน้าจะ reload ให้อัตโนมัติ
              </p>
              {tabDef.textFields.map((f) => (
                <TextRow
                  key={f.path}
                  label={f.label}
                  long={f.long}
                  value={readPath(draft, f.path) ?? ''}
                  onChange={(v) => setText(f.path, v)}
                  onReset={() => setText(f.path, readPath(defaults, f.path) ?? '')}
                />
              ))}
            </Section>
          </aside>
        )}

        {/* Right: live iframe */}
        <div style={previewWrap}>
          <div style={previewBar}>
            <span style={previewBarText}>
              {tabDef.src}
              {!iframeReady && <span style={{ marginLeft: 10, color: 'var(--grey-3)' }}>· loading…</span>}
            </span>
            <button type="button" onClick={reloadIframe} style={smallBtn}>
              ↻ Reload
            </button>
          </div>
          <iframe
            ref={iframeRef}
            key={`${tab}-${reloadNonce}`}
            title={`Blot preview — ${tabDef.label}`}
            src={tabDef.src}
            style={iframe}
          />
        </div>
      </div>
    </div>
  );
}

// =================================================================
// Helpers
// =================================================================

function pushTheme(iframeEl, theme) {
  if (!iframeEl?.contentWindow) return;
  iframeEl.contentWindow.postMessage(
    { type: 'blot-preview', theme: theme || {} },
    window.location.origin,
  );
}

function deepClone(o) { return JSON.parse(JSON.stringify(o ?? {})); }

function readPath(obj, path) {
  if (!obj) return undefined;
  return path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

function writePath(obj, path, value) {
  const keys = path.split('.');
  const out = Array.isArray(obj) ? obj.slice() : { ...(obj || {}) };
  let cur = out;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] = cur[k] == null ? {} : (Array.isArray(cur[k]) ? cur[k].slice() : { ...cur[k] });
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return out;
}

// =================================================================
// Sub-components
// =================================================================

function Section({ title, children }) {
  return (
    <section style={sectionCard}>
      <h2 style={sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

function ColorRow({ label, value, onChange, onReset }) {
  // Allow text input alongside the colour picker so users can type hex /
  // rgb / named colours that the picker won't surface.
  const safeColor = isHex(value) ? value : '#000000';
  return (
    <div style={fieldRow}>
      <div style={fieldLabel}>{label}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="color"
          value={safeColor}
          onChange={(e) => onChange(e.target.value)}
          style={colorSwatch}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={textInput}
          placeholder="#000000"
        />
        <button type="button" onClick={onReset} style={resetMini} title="Reset to default">↺</button>
      </div>
    </div>
  );
}

function FontRow({ label, value, onChange, onReset, presets }) {
  return (
    <div style={fieldRow}>
      <div style={fieldLabel}>{label}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...textInput, flex: 1 }}
        />
        <button type="button" onClick={onReset} style={resetMini} title="Reset">↺</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            style={{ ...presetChip, fontFamily: p }}
            title={p}
          >
            {p.split(',')[0].replace(/['"]/g, '')}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextRow({ label, long, value, onChange, onReset }) {
  return (
    <div style={fieldRow}>
      <div style={fieldLabel}>{label}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {long ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            style={{ ...textInput, flex: 1, resize: 'vertical' }}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ ...textInput, flex: 1 }}
          />
        )}
        <button type="button" onClick={onReset} style={resetMini} title="Reset">↺</button>
      </div>
    </div>
  );
}

function isHex(v) { return typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v); }

// =================================================================
// Styles
// =================================================================

const layout = { display: 'flex', flexDirection: 'column', gap: 16, minHeight: '78vh' };
const topBar = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' };
const h1 = { fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 400, marginTop: 4 };

const tabBar = {
  display: 'flex', gap: 8, padding: 6,
  background: 'var(--offwhite)', border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-md)', alignItems: 'center',
};
const tabBtn = {
  padding: '8px 16px', fontFamily: 'var(--font-mono)', fontSize: 11,
  letterSpacing: '.2em', textTransform: 'uppercase',
  border: '1px solid transparent', borderRadius: 'var(--radius-sm)',
  background: 'transparent', cursor: 'pointer', color: 'var(--ink)',
};
const tabBtnActive = { background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' };

const split = { display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'stretch', minHeight: '70vh' };
const panel = {
  display: 'flex', flexDirection: 'column', gap: 14,
  maxHeight: '78vh', overflowY: 'auto', paddingRight: 4,
};

const sectionCard = {
  background: 'var(--paper)',
  border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-md)',
  padding: '14px 14px 16px',
  boxShadow: 'var(--shadow-soft)',
};
const sectionTitle = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase',
  color: 'var(--grey-3)', marginBottom: 10,
};

const fieldRow = { marginBottom: 12 };
const fieldLabel = { fontSize: 12, color: 'var(--grey-2)', marginBottom: 4 };

const textInput = {
  width: '100%', padding: '8px 10px',
  background: 'var(--paper)', border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--ink)',
  fontFamily: 'var(--font-mono)',
};
const colorSwatch = {
  width: 36, height: 32, padding: 0, border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'var(--paper)',
};
const resetMini = {
  background: 'var(--paper)', border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-sm)', padding: '6px 8px', fontSize: 12, cursor: 'pointer',
};
const resetBtn = {
  marginTop: 6, padding: '8px 12px', background: 'var(--paper)',
  border: '1px solid var(--grey-5)', borderRadius: 'var(--radius-sm)',
  fontSize: 12, cursor: 'pointer', width: '100%',
};
const presetChip = {
  padding: '4px 8px', background: 'var(--offwhite)',
  border: '1px solid var(--grey-5)', borderRadius: 'var(--radius-pill)',
  fontSize: 11, cursor: 'pointer',
};

const previewWrap = {
  display: 'flex', flexDirection: 'column',
  border: '1px solid var(--grey-5)', borderRadius: 'var(--radius-md)',
  background: 'var(--paper)', overflow: 'hidden', boxShadow: 'var(--shadow-soft)',
};
const previewBar = {
  padding: '8px 12px', background: 'var(--offwhite)',
  borderBottom: '1px solid var(--grey-5)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  fontFamily: 'var(--font-mono)', fontSize: 11,
};
const previewBarText = { letterSpacing: '.1em', color: 'var(--grey-2)' };
const smallBtn = {
  padding: '4px 10px', background: 'var(--paper)',
  border: '1px solid var(--grey-5)', borderRadius: 'var(--radius-pill)',
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.18em',
  textTransform: 'uppercase', cursor: 'pointer',
};
const iframe = { width: '100%', flex: 1, minHeight: '70vh', border: 'none', background: 'var(--paper)' };

const toggleWrap = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.2em',
  textTransform: 'uppercase', color: 'var(--grey-2)',
};

const okBox  = { padding: '10px 14px', border: '1px solid var(--ink)',     background: 'var(--ink)',     color: 'var(--paper)', borderRadius: 'var(--radius-sm)', fontSize: 13 };
const errBox = { padding: '10px 14px', border: '1px solid #b91c1c',        background: '#fef2f2',        color: '#b91c1c',      borderRadius: 'var(--radius-sm)', fontSize: 13 };
const infoBox = { padding: '10px 14px', border: '1px solid var(--grey-5)', background: 'var(--offwhite)', color: 'var(--grey-2)', borderRadius: 'var(--radius-sm)', fontSize: 13 };
