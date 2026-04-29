'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * SiteEditor — visual, click-to-edit editor.
 *
 * Layout:
 *   ┌──────────────────────────────────────┬────────────┐
 *   │ Live iframe (3 tabs: home/quiz/result) │  Inspector │
 *   │                                       │  (the      │
 *   │   click any text → opens inspector    │  editor)   │
 *   └──────────────────────────────────────┴────────────┘
 *
 * The inspector shows controls for the currently-selected element:
 *   - Text content   (live-pushed via postMessage)
 *   - Color          (live)
 *   - Font family    (live)
 *   - Font size      (live)
 *   - Font weight    (live)
 *   - Letter spacing (live)
 *
 * A separate "Theme" tab lets the user change global colours / fonts —
 * those still apply via CSS variables and affect every element.
 *
 * Save persists everything (theme + styles + text) to /api/admin/copy.
 * No auto-save.
 */

const TABS = [
  { id: 'home',   label: 'Home',   src: '/?preview=1',         description: 'Hero / Method / About' },
  { id: 'quiz',   label: 'Quiz',   src: '/quiz?preview=1',     description: 'Quiz steps (apply ทุกหน้า)' },
  { id: 'result', label: 'Result', src: '/result?preview=1',   description: 'Result page (sample data)' },
];

const THEME_FIELDS = [
  { key: 'ink',      label: 'Ink (text)',         kind: 'color' },
  { key: 'paper',    label: 'Paper (background)', kind: 'color' },
  { key: 'offwhite', label: 'Off-white panels',   kind: 'color' },
  { key: 'grey5',    label: 'Border / divider',   kind: 'color' },
  { key: 'grey3',    label: 'Muted text',         kind: 'color' },
  { key: 'grey2',    label: 'Secondary text',     kind: 'color' },
  { key: 'fontSerif', label: 'Serif font',        kind: 'font', preset: 'serif' },
  { key: 'fontSans',  label: 'Sans font',         kind: 'font', preset: 'sans' },
  { key: 'fontMono',  label: 'Mono font',         kind: 'font', preset: 'mono' },
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

const FONT_WEIGHTS = ['300', '400', '500', '600', '700'];

// Maps each `data-edit-key` → which `copy.json` path holds its text. For
// 99 % of keys the path is identical to the edit-key, so we only list the
// exceptions here. Anything not listed falls through to identity mapping.
const TEXT_PATH_OVERRIDES = {
  // 'home.title' uses copy.home.title etc. — identity mapping covers these.
};
function textPathFor(key) { return TEXT_PATH_OVERRIDES[key] || key; }

export default function SiteEditor({ initial, defaults }) {
  const [draft, setDraft] = useState(() => deepClone(initial));
  const [tab, setTab]       = useState('home');
  const [editMode, setEdit] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [picked, setPicked] = useState(null); // { key, computed }
  const [inspectorTab, setInspectorTab] = useState('element'); // element | theme
  const [reloadNonce, setReloadNonce] = useState(0);
  const iframeRef = useRef(null);

  const tabDef = TABS.find((t) => t.id === tab) || TABS[0];

  // ---- Live push to iframe whenever the draft changes -----------------
  useEffect(() => {
    if (!iframeReady) return;
    pushPreview(iframeRef.current, draft);
  }, [iframeReady, draft]);

  // ---- Listen for the iframe's ready handshake + click-pick ----------
  useEffect(() => {
    function onMessage(ev) {
      if (ev.origin !== window.location.origin) return;
      const m = ev.data;
      if (!m || typeof m !== 'object') return;
      if (m.type === 'blot-preview-ready') {
        setIframeReady(true);
        pushPreview(iframeRef.current, draft);
      } else if (m.type === 'blot-pick' && m.key) {
        setPicked({ key: m.key, computed: m.computed || {} });
        setInspectorTab('element');
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line
  }, []);

  // ---- Mutators -------------------------------------------------------
  function setTheme(key, value) {
    setDraft((prev) => ({ ...prev, theme: { ...(prev.theme || {}), [key]: value } }));
  }
  function setElementStyle(key, prop, value) {
    setDraft((prev) => {
      const styles = { ...(prev.styles || {}) };
      const cur = { ...(styles[key] || {}) };
      if (value == null || value === '') delete cur[prop];
      else cur[prop] = value;
      if (Object.keys(cur).length === 0) delete styles[key];
      else styles[key] = cur;
      return { ...prev, styles };
    });
  }
  function setElementText(key, value) {
    const path = textPathFor(key);
    setDraft((prev) => writePath(prev, path, value));
  }
  function resetElement(key) {
    setDraft((prev) => {
      const styles = { ...(prev.styles || {}) };
      delete styles[key];
      const text = readPath(defaults, textPathFor(key));
      const next = writePath({ ...prev, styles }, textPathFor(key), text);
      return next;
    });
  }
  function discard() {
    if (!confirm('Discard all unsaved edits?')) return;
    setDraft(deepClone(initial));
    setMsg({ kind: 'info', text: 'Reverted draft to last saved state.' });
  }
  function resetTheme() {
    if (!confirm('Reset theme (colours + fonts) back to defaults?')) return;
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
      reloadIframe();
      setMsg({ kind: 'ok', text: 'Saved · public site updated.' });
    } catch (e) {
      setMsg({ kind: 'err', text: e.message });
    } finally {
      setSaving(false);
    }
  }

  function onSelectTab(id) {
    if (id === tab) return;
    setIframeReady(false);
    setPicked(null);
    setTab(id);
  }
  function reloadIframe() { setIframeReady(false); setReloadNonce((n) => n + 1); }

  // ---- Derived: current values for the picked element ----------------
  const pickedKey   = picked?.key || null;
  const pickedStyle = pickedKey ? (draft.styles?.[pickedKey] || {}) : null;
  const pickedText  = pickedKey ? (readPath(draft, textPathFor(pickedKey)) ?? '') : '';

  return (
    <div style={layout}>
      {/* ============== Top bar ============== */}
      <header style={topBar}>
        <div>
          <span className="meta">Site editor</span>
          <h1 style={h1}>Visual preview &amp; theme</h1>
          <p style={{ color: 'var(--grey-2)', fontSize: 13, marginTop: 4 }}>
            คลิกที่ <strong>ข้อความใดๆ</strong> ในตัวอย่าง → แก้ไขตัวอักษร / สี / ฟอนต์ / ขนาด ในกล่องด้านขวา → กด <strong>Save</strong> เพื่ออัปเดต public
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
          <button className="btn ghost" type="button" onClick={discard} disabled={saving}>Discard</button>
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

      {/* ============== Tabs ============== */}
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

      {/* ============== Split pane ============== */}
      <div style={{ ...split, gridTemplateColumns: editMode ? '1fr 380px' : '1fr' }}>
        {/* Live iframe (LEFT, large) */}
        <div style={previewWrap}>
          <div style={previewBar}>
            <span style={previewBarText}>
              {tabDef.src}
              {!iframeReady && <span style={{ marginLeft: 10, color: 'var(--grey-3)' }}>· loading…</span>}
              {pickedKey && <span style={{ marginLeft: 10, color: 'var(--grey-2)' }}>· selected: <code>{pickedKey}</code></span>}
            </span>
            <button type="button" onClick={reloadIframe} style={smallBtn}>↻ Reload</button>
          </div>
          <iframe
            ref={iframeRef}
            key={`${tab}-${reloadNonce}`}
            title={`Blot preview — ${tabDef.label}`}
            src={tabDef.src}
            style={iframe}
          />
        </div>

        {/* Inspector (RIGHT) */}
        {editMode && (
          <aside style={panel}>
            <div style={inspectorTabBar}>
              <button
                type="button"
                onClick={() => setInspectorTab('element')}
                style={{ ...inspectorTab_, ...(inspectorTab === 'element' ? inspectorTabActive : {}) }}
              >
                Element
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab('theme')}
                style={{ ...inspectorTab_, ...(inspectorTab === 'theme' ? inspectorTabActive : {}) }}
              >
                Theme
              </button>
            </div>

            {inspectorTab === 'element' ? (
              !pickedKey ? (
                <EmptyHint />
              ) : (
                <ElementInspector
                  key={pickedKey}
                  pickedKey={pickedKey}
                  computed={picked.computed}
                  style={pickedStyle}
                  text={pickedText}
                  onText={(v) => setElementText(pickedKey, v)}
                  onStyle={(prop, v) => setElementStyle(pickedKey, prop, v)}
                  onResetElement={() => resetElement(pickedKey)}
                />
              )
            ) : (
              <ThemePanel
                theme={draft.theme || {}}
                defaults={defaults.theme || {}}
                onSet={setTheme}
                onResetAll={resetTheme}
              />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

// =================================================================
// Inspector — element (selected via click in preview)
// =================================================================

function EmptyHint() {
  return (
    <div style={{ ...sectionCard, textAlign: 'center', padding: '40px 24px' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, marginBottom: 8 }}>
        ↖ Click any text in the preview
      </div>
      <p style={{ fontSize: 13, color: 'var(--grey-2)', lineHeight: 1.7 }}>
        ในตัวอย่างด้านซ้าย ทุกข้อความที่มีกรอบประจะ <em>คลิกได้</em> —
        คลิกแล้วจะเปิดกล่องแก้ไขตรงนี้ให้พิมพ์ข้อความใหม่,
        เปลี่ยนสี, ฟอนต์, และขนาด ได้ทันที
      </p>
      <p style={{ fontSize: 12, color: 'var(--grey-3)', marginTop: 14 }}>
        หรือเปิดแท็บ <strong>Theme</strong> ด้านบน เพื่อเปลี่ยนสี / ฟอนต์ ทั้งเว็บพร้อมกัน
      </p>
    </div>
  );
}

function ElementInspector({ pickedKey, computed, style, text, onText, onStyle, onResetElement }) {
  // Pull a sensible "current value" for each control: prefer the override
  // already in draft.styles; otherwise show what the iframe is computing.
  const get = (prop) => style?.[prop] ?? computed?.[prop] ?? '';

  return (
    <>
      <Section title={`Element · ${pickedKey}`}>
        <FieldRow label="Text">
          <textarea
            value={text || ''}
            onChange={(e) => onText(e.target.value)}
            rows={3}
            style={{ ...textInput, resize: 'vertical', flex: 1 }}
          />
        </FieldRow>
      </Section>

      <Section title="Color">
        <ColorRow
          value={get('color')}
          onChange={(v) => onStyle('color', v)}
          onClear={() => onStyle('color', '')}
        />
      </Section>

      <Section title="Typography">
        <FieldRow label="Font family">
          <input
            type="text"
            value={get('fontFamily') || ''}
            onChange={(e) => onStyle('fontFamily', e.target.value)}
            placeholder={computed?.fontFamily || ''}
            style={{ ...textInput, flex: 1 }}
          />
        </FieldRow>
        <PresetChips
          presets={[...FONT_PRESETS.serif, ...FONT_PRESETS.sans, ...FONT_PRESETS.mono]}
          onPick={(v) => onStyle('fontFamily', v)}
        />
        <FieldRow label="Font size">
          <SizeInput
            value={get('fontSize') || ''}
            placeholder={computed?.fontSize || '16px'}
            onChange={(v) => onStyle('fontSize', v)}
          />
        </FieldRow>
        <FieldRow label="Font weight">
          <select
            value={get('fontWeight') || ''}
            onChange={(e) => onStyle('fontWeight', e.target.value)}
            style={{ ...textInput, flex: 1 }}
          >
            <option value="">— inherit —</option>
            {FONT_WEIGHTS.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label="Letter spacing">
          <input
            type="text"
            value={get('letterSpacing') || ''}
            onChange={(e) => onStyle('letterSpacing', e.target.value)}
            placeholder={computed?.letterSpacing || 'normal'}
            style={{ ...textInput, flex: 1 }}
          />
        </FieldRow>
      </Section>

      <button type="button" onClick={onResetElement} style={resetBtn}>
        ↺ Reset this element to defaults
      </button>
    </>
  );
}

function SizeInput({ value, placeholder, onChange }) {
  // Accept any CSS length value but offer a slider that nudges in 1px when
  // the value is a px number (the common case).
  const numMatch = /^(-?\d+(?:\.\d+)?)px$/.exec(value || '');
  const numValue = numMatch ? Number(numMatch[1]) : null;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
      <input
        type="text"
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...textInput, width: 100 }}
      />
      {numValue != null && (
        <input
          type="range"
          min="8"
          max="120"
          value={numValue}
          onChange={(e) => onChange(`${e.target.value}px`)}
          style={{ flex: 1 }}
        />
      )}
    </div>
  );
}

// =================================================================
// Inspector — theme tab (global brand)
// =================================================================

function ThemePanel({ theme, defaults, onSet, onResetAll }) {
  return (
    <>
      <Section title="Theme · colours">
        {THEME_FIELDS.filter((f) => f.kind === 'color').map((f) => (
          <FieldRow key={f.key} label={f.label}>
            <ColorRow
              value={theme[f.key] || ''}
              onChange={(v) => onSet(f.key, v)}
              onClear={() => onSet(f.key, defaults[f.key] || '')}
            />
          </FieldRow>
        ))}
      </Section>

      <Section title="Theme · typography">
        {THEME_FIELDS.filter((f) => f.kind === 'font').map((f) => (
          <div key={f.key}>
            <FieldRow label={f.label}>
              <input
                type="text"
                value={theme[f.key] || ''}
                onChange={(e) => onSet(f.key, e.target.value)}
                style={{ ...textInput, flex: 1 }}
              />
            </FieldRow>
            <PresetChips presets={FONT_PRESETS[f.preset]} onPick={(v) => onSet(f.key, v)} />
          </div>
        ))}
        <button type="button" onClick={onResetAll} style={resetBtn}>
          ↺ Reset all theme to defaults
        </button>
      </Section>
    </>
  );
}

// =================================================================
// Reusable bits
// =================================================================

function Section({ title, children }) {
  return (
    <section style={sectionCard}>
      <h2 style={sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

function FieldRow({ label, children }) {
  return (
    <div style={fieldRow}>
      <div style={fieldLabel}>{label}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{children}</div>
    </div>
  );
}

function ColorRow({ value, onChange, onClear }) {
  const safeColor = isHex(value) ? value : '#000000';
  return (
    <>
      <input type="color" value={safeColor} onChange={(e) => onChange(e.target.value)} style={colorSwatch} />
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...textInput, flex: 1 }}
        placeholder="#000000 or rgb(...)"
      />
      <button type="button" onClick={onClear} style={resetMini} title="Clear / reset">↺</button>
    </>
  );
}

function PresetChips({ presets, onPick }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0 12px' }}>
      {presets.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPick(p)}
          style={{ ...presetChip, fontFamily: p }}
          title={p}
        >
          {p.split(',')[0].replace(/['"]/g, '')}
        </button>
      ))}
    </div>
  );
}

// =================================================================
// Helpers
// =================================================================

function pushPreview(iframeEl, draft) {
  if (!iframeEl?.contentWindow) return;
  const textMap = collectTextOverrides(draft);
  iframeEl.contentWindow.postMessage(
    {
      type: 'blot-preview',
      theme:  draft.theme  || {},
      styles: draft.styles || {},
      text:   textMap,
    },
    window.location.origin,
  );
}

// Build a flat { 'home.title': 'Found in a few dips.', ... } map for every
// `data-edit-key` we know about. The PreviewBridge applies these over the
// initially-rendered text so unsaved edits show up live.
function collectTextOverrides(draft) {
  const out = {};
  // We use the same identity mapping as TEXT_PATH_OVERRIDES — every key
  // we tag in JSX uses copy-path naming, so we just walk the merged
  // object and emit any string leaf whose path is plausibly an edit-key.
  walkStrings(draft, '', (path, value) => {
    // Skip the theme + styles + _note branches.
    if (path === '_note' || path.startsWith('theme.') || path === 'theme'
        || path.startsWith('styles.') || path === 'styles') return;
    out[path] = value;
  });
  return out;
}

function walkStrings(node, path, onLeaf) {
  if (node == null) return;
  if (typeof node === 'string') { onLeaf(path, node); return; }
  if (Array.isArray(node)) return; // skip arrays — array indices aren't tagged
  if (typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    const next = path ? `${path}.${k}` : k;
    walkStrings(v, next, onLeaf);
  }
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

const split = { display: 'grid', gap: 16, alignItems: 'stretch', minHeight: '70vh' };
const panel = {
  display: 'flex', flexDirection: 'column', gap: 12,
  maxHeight: '78vh', overflowY: 'auto', paddingRight: 4,
};

const inspectorTabBar = { display: 'flex', gap: 4, padding: 4, background: 'var(--offwhite)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--grey-5)' };
const inspectorTab_ = {
  flex: 1, padding: '8px 12px',
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase',
  border: '1px solid transparent', borderRadius: 'var(--radius-sm)',
  background: 'transparent', cursor: 'pointer', color: 'var(--ink)',
};
const inspectorTabActive = { background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' };

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
