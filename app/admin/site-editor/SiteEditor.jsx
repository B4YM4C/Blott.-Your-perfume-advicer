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

const DEVICES = [
  { id: 'desktop', label: 'Desktop', width: '100%', minHeight: '70vh' },
  { id: 'tablet',  label: 'Tablet',  width: 820,    minHeight: 900 },
  { id: 'mobile',  label: 'Mobile',  width: 390,    minHeight: 780 },
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

const SECTION_TEMPLATES = [
  {
    id: 'editorial-card',
    label: 'Editorial Card',
    description: 'Card เรียบแบบ CI ปัจจุบัน เหมาะกับข้อความสั้น',
    eyebrow: 'Editorial',
    title: 'A refined scent note.',
    body: 'Use this compact card for campaign copy, announcements, or a small story block.',
    ctaLabel: 'Start the quiz ->',
    ctaHref: '/quiz',
  },
  {
    id: 'feature-banner',
    label: 'Feature Banner',
    description: 'Banner เต็มแถวสำหรับ headline สำคัญ',
    eyebrow: 'Feature',
    title: 'A bigger story across the full row.',
    body: 'Use this when one message should anchor the section and feel more editorial.',
    ctaLabel: 'Explore ->',
    ctaHref: '/quiz',
  },
  {
    id: 'quiet-note',
    label: 'Quiet Note',
    description: 'กล่องเส้นประ เบาๆ สำหรับ note หรือ hint',
    eyebrow: 'Note',
    title: 'A quiet little detail.',
    body: 'A softer block for supporting information without overpowering the page.',
    ctaLabel: 'Read more',
    ctaHref: '/#about',
  },
  {
    id: 'dark-cta',
    label: 'Dark CTA',
    description: 'แถบดำชัดสำหรับ call-to-action',
    eyebrow: 'Ready',
    title: 'Find your match now.',
    body: 'A strong conversion block that keeps the black-and-white Blot. identity.',
    ctaLabel: 'Begin the dip ->',
    ctaHref: '/quiz',
  },
  {
    id: 'quote-panel',
    label: 'Quote Panel',
    description: 'ข้อความ quote / testimonial',
    eyebrow: 'Quote',
    title: '“Your scent should feel like you.”',
    body: 'Use this for a testimonial, brand belief, or a short sentence with attitude.',
    ctaLabel: 'About Blot.',
    ctaHref: '/#about',
  },
  {
    id: 'compact-card',
    label: 'Compact Card',
    description: 'การ์ดเล็กไว้เพิ่มหลายใบใน grid',
    eyebrow: 'Mini',
    title: 'Small but useful.',
    body: 'A dense card for lists, benefits, or small campaign details.',
    ctaLabel: 'Open',
    ctaHref: '/quiz',
  },
  {
    id: 'split-copy',
    label: 'Split Copy',
    description: 'กล่องสองน้ำหนัก เหมาะกับหัวข้อ + อธิบาย',
    eyebrow: 'Split',
    title: 'One idea, two speeds.',
    body: 'Use this for a section that needs a clear headline and a longer explanatory note.',
    ctaLabel: 'Continue ->',
    ctaHref: '/quiz',
  },
  {
    id: 'metric-card',
    label: 'Metric Card',
    description: 'ตัวเลข/คำสั้นแบบ mono',
    eyebrow: 'Signal',
    title: '01',
    body: 'A numbered proof point, metric, or short editorial signal.',
    ctaLabel: 'See method',
    ctaHref: '/#method',
  },
  {
    id: 'soft-panel',
    label: 'Soft Panel',
    description: 'กล่องขาวไล่เฉดนุ่มๆ สำหรับคำอธิบาย',
    eyebrow: 'Soft panel',
    title: 'Clean, calm, readable.',
    body: 'A gentle panel that keeps the page balanced when the surrounding layout is dense.',
    ctaLabel: 'Learn more',
    ctaHref: '/#about',
  },
  {
    id: 'campaign-strip',
    label: 'Campaign Strip',
    description: 'แถบโปรโมตแนวนอน CTA อยู่ขวา',
    eyebrow: 'Campaign',
    title: 'Drop a campaign here.',
    body: 'A horizontal strip for seasonal pushes, drops, quizzes, or event announcements.',
    ctaLabel: 'Join now ->',
    ctaHref: '/quiz',
  },
];

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
  const [device, setDevice] = useState('desktop');
  const [reloadNonce, setReloadNonce] = useState(0);
  const [trashHot, setTrashHot] = useState(false);
  const [dragPayload, setDragPayload] = useState(null);
  const iframeRef = useRef(null);
  const draftRef = useRef(draft);

  const tabDef = TABS.find((t) => t.id === tab) || TABS[0];
  const deviceDef = DEVICES.find((d) => d.id === device) || DEVICES[0];

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  // Set of every JSON-path that holds a STRING leaf in the merged copy —
  // used to tell text-keys (e.g. "home.title") from style-only keys
  // (e.g. "result.card.fragranceName" — the text is dynamic from the DB).
  const textKeySet = useMemo(() => {
    const set = new Set();
    walkStrings(draft, '', (path) => {
      if (path === '_note' || path.startsWith('theme.') || path === 'theme'
          || path.startsWith('styles.') || path === 'styles') return;
      set.add(path);
    });
    // The pickedKey can also use TEXT_PATH_OVERRIDES, so every override
    // target counts as a text-key too.
    for (const v of Object.values(TEXT_PATH_OVERRIDES)) set.add(v);
    return set;
  }, [draft]);

  // ---- Live push to iframe whenever the draft changes -----------------
  useEffect(() => {
    if (!iframeReady) return;
    pushPreview(iframeRef.current, draft, inspectorTab);
  }, [iframeReady, draft, inspectorTab]);

  // ---- Listen for the iframe's ready handshake + click-pick ----------
  useEffect(() => {
    function onMessage(ev) {
      if (ev.origin !== window.location.origin) return;
      const m = ev.data;
      if (!m || typeof m !== 'object') return;
      if (m.type === 'blot-preview-ready') {
        setIframeReady(true);
        pushPreview(iframeRef.current, draft, inspectorTab);
      } else if (m.type === 'blot-pick' && m.key) {
        setPicked({ key: m.key, computed: m.computed || {} });
        setInspectorTab('element');
      } else if (m.type === 'blot-structure-add' && m.path) {
        const index = resolveListIndex(m.path, Number(m.index || 0), m.id);
        if (m.mode === 'duplicate') duplicateListItem(m.path, index, 1);
        else addListItem(m.path, templateForPath(m.path), m.where === 'before' ? index : index + 1);
        setInspectorTab('structure');
      } else if (m.type === 'blot-structure-add-template' && m.path) {
        const index = resolveListIndex(m.path, Number(m.index || 0), m.id);
        addListItem(m.path, sanitizeStructureItem(m.item || templateForPath(m.path)), m.where === 'before' ? index : index + 1);
        setInspectorTab('structure');
      } else if (m.type === 'blot-structure-remove' && m.path) {
        removeListItem(m.path, Number(m.index || 0), m.id);
        setInspectorTab('structure');
      } else if (m.type === 'blot-structure-move' && m.path) {
        moveListItem(m.path, Number(m.from), Number(m.to), m.fromId, m.toId);
        setInspectorTab('structure');
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
  function setPathValue(path, value) {
    setDraft((prev) => writePath(prev, path, value));
  }
  function listAt(path) {
    const v = readPath(draftRef.current, path);
    return Array.isArray(v) ? v : [];
  }
  function setList(path, next) {
    setPathValue(path, next);
  }
  function resolveListIndex(path, index, id) {
    const items = listAt(path);
    if (id != null && id !== '') {
      const needle = String(id);
      const found = items.findIndex((item, i) => String(stableItemId(item, i)) === needle);
      if (found >= 0) return found;
    }
    if (!Number.isFinite(index)) return 0;
    return Math.max(0, Math.min(index, Math.max(items.length - 1, 0)));
  }
  function addListItem(path, item, index = null) {
    const items = listAt(path);
    const next = [...items];
    const target = index == null ? next.length : Math.max(0, Math.min(index, next.length));
    next.splice(target, 0, sanitizeStructureItem(item));
    setList(path, next);
  }
  function updateListItem(path, index, patch) {
    setList(path, listAt(path).map((item, i) => i === index ? { ...item, ...patch } : item));
  }
  function updateListItemStyle(path, index, prop, value) {
    setList(path, listAt(path).map((item, i) => {
      if (i !== index) return item;
      const style = { ...(item.style || {}) };
      if (value === '') delete style[prop];
      else style[prop] = value;
      return { ...item, style };
    }));
  }
  function removeListItem(path, index, id = null) {
    const target = resolveListIndex(path, index, id);
    setList(path, listAt(path).filter((_, i) => i !== target));
  }
  function moveListItem(path, from, to, fromId = null, toId = null) {
    const items = listAt(path);
    from = resolveListIndex(path, from, fromId);
    to = resolveListIndex(path, to, toId);
    if (from == null || to == null || from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
    const next = [...items];
    const [pickedItem] = next.splice(from, 1);
    next.splice(to, 0, pickedItem);
    setList(path, next);
  }
  function duplicateListItem(path, index, offset = 1, id = null) {
    index = resolveListIndex(path, index, id);
    const item = listAt(path)[index];
    if (!item) return;
    const next = { ...deepClone(item), id: item.id ? `${item.id}-copy` : undefined, key: item.key ? `${item.key}-copy` : undefined };
    addListItem(path, next, index + offset);
  }
  function deleteDragPayload(payload = dragPayload) {
    if (!payload?.path || payload.index == null || payload.type === 'template') return;
    removeListItem(payload.path, payload.index, payload.id);
    setDragPayload(null);
    setTrashHot(false);
  }
  function resetElement(key) {
    setDraft((prev) => {
      const styles = { ...(prev.styles || {}) };
      delete styles[key];
      const path = textPathFor(key);
      const defaultText = readPath(defaults, path);
      // For style-only keys (no text in copy.json) we just clear the
      // style override — there's no text to reset because the content
      // is dynamic from the DB.
      if (defaultText === undefined) return { ...prev, styles };
      return writePath({ ...prev, styles }, path, defaultText);
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
  const pickedTextPath = pickedKey ? textPathFor(pickedKey) : null;
  // A picked element is "style-only" when its key doesn't correspond to a
  // string leaf in copy.json — i.e. the text is dynamic (DB content like
  // a fragrance name, an iterated note, an alternate's blurb, etc.).
  const isStyleOnly = pickedKey ? !textKeySet.has(pickedTextPath) : false;
  const pickedText  = pickedKey ? (readPath(draft, pickedTextPath) ?? '') : '';

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
          <div style={deviceSwitch} aria-label="Preview device size">
            {DEVICES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDevice(d.id)}
                style={{ ...deviceBtn, ...(device === d.id ? deviceBtnActive : {}) }}
              >
                {d.label}
              </button>
            ))}
          </div>
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
        <div style={previewCanvas}>
          <div style={{ ...previewWrap, width: deviceDef.width, maxWidth: '100%' }}>
            <div style={previewBar}>
              <span style={previewBarText}>
                {tabDef.src}
                <span style={{ marginLeft: 10, color: 'var(--grey-3)' }}>· {deviceDef.label}</span>
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
              style={{ ...iframe, minHeight: deviceDef.minHeight }}
            />
          </div>
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
              <button
                type="button"
                onClick={() => setInspectorTab('structure')}
                style={{ ...inspectorTab_, ...(inspectorTab === 'structure' ? inspectorTabActive : {}) }}
              >
                Structure
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
                  isStyleOnly={isStyleOnly}
                  onText={(v) => setElementText(pickedKey, v)}
                  onStyle={(prop, v) => setElementStyle(pickedKey, prop, v)}
                  onResetElement={() => resetElement(pickedKey)}
                />
              )
            ) : inspectorTab === 'theme' ? (
              <ThemePanel
                theme={draft.theme || {}}
                defaults={defaults.theme || {}}
                onSet={setTheme}
                onResetAll={resetTheme}
              />
            ) : (
              <StructurePanel
                draft={draft}
                dragPayload={dragPayload}
                trashHot={trashHot}
                onDragStart={setDragPayload}
                onDragEnd={() => { setDragPayload(null); setTrashHot(false); }}
                onTrashHot={setTrashHot}
                onDeleteDrag={deleteDragPayload}
                onAdd={addListItem}
                onUpdate={updateListItem}
                onUpdateStyle={updateListItemStyle}
                onRemove={removeListItem}
                onMove={moveListItem}
                onDuplicate={duplicateListItem}
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

function ElementInspector({ pickedKey, computed, style, text, isStyleOnly, onText, onStyle, onResetElement }) {
  // Pull a sensible "current value" for each control: prefer the override
  // already in draft.styles; otherwise show what the iframe is computing.
  const get = (prop) => style?.[prop] ?? computed?.[prop] ?? '';

  return (
    <>
      <Section title={`Element · ${pickedKey}`}>
        {isStyleOnly ? (
          <div style={dynamicNotice}>
            <strong style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
              Style-only element
            </strong>
            <span style={{ fontSize: 12, color: 'var(--grey-2)', lineHeight: 1.6 }}>
              ข้อความตรงนี้มาจากฐานข้อมูล (ชื่อน้ำหอม / รายละเอียดใน card / โน้ต ฯลฯ)
              จึงแก้ตรงนี้ไม่ได้ — แต่ปรับ <em>สี / ฟอนต์ / ขนาด / น้ำหนัก</em> ได้ทุกที่
              ที่ใช้ key นี้พร้อมกัน
            </span>
          </div>
        ) : (
          <FieldRow label="Text">
            <textarea
              value={text || ''}
              onChange={(e) => onText(e.target.value)}
              rows={3}
              style={{ ...textInput, resize: 'vertical', flex: 1 }}
            />
          </FieldRow>
        )}
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

function StructurePanel({
  draft,
  dragPayload,
  trashHot,
  onDragStart,
  onDragEnd,
  onTrashHot,
  onDeleteDrag,
  onAdd,
  onUpdate,
  onUpdateStyle,
  onRemove,
  onMove,
  onDuplicate,
}) {
  const navItems = Array.isArray(draft.navigation?.items) ? draft.navigation.items : [];
  const navCtas = Array.isArray(draft.navigation?.ctas)
    ? draft.navigation.ctas
    : (draft.navigation?.cta ? [draft.navigation.cta] : []);
  const steps = Array.isArray(draft.method?.steps) ? draft.method.steps : [];
  const sections = Array.isArray(draft.home?.sections) ? draft.home.sections : [];
  const pages = Array.isArray(draft.pages) ? draft.pages : [];
  const footerColumns = Array.isArray(draft.footer?.columns) ? draft.footer.columns : [];

  return (
    <>
      <div
        style={{ ...trashZone, ...(trashHot ? trashZoneHot : {}) }}
        onDragOver={(e) => { e.preventDefault(); onTrashHot(true); }}
        onDragLeave={() => onTrashHot(false)}
        onDrop={(e) => { e.preventDefault(); onDeleteDrag(dragPayload); }}
      >
        <span style={trashIcon}>⌫</span>
        <strong>Drop here to delete</strong>
        <small>ลาก menu / CTA / card / section มาวางเพื่อลบ</small>
      </div>

      <TemplateLibrary
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onAdd={(template) => onAdd('home.sections', sectionFromTemplate(template), sections.length)}
      />

      <ListBlock
        title="Header menu"
        path="navigation.items"
        items={navItems}
        addLabel="+ menu"
        template={newNavItem()}
        fields={[
          { key: 'label', label: 'Text' },
          { key: 'href', label: 'Redirect link' },
          { key: 'key', label: 'Puzzle key' },
        ]}
        styleFields
        onDragStart={onDragStart}
        dragPayload={dragPayload}
        onDragEnd={onDragEnd}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onUpdateStyle={onUpdateStyle}
        onRemove={onRemove}
        onMove={onMove}
        onDuplicate={onDuplicate}
      />

      <ListBlock
        title="Header CTA buttons"
        path="navigation.ctas"
        items={navCtas}
        addLabel="+ CTA"
        template={newCta()}
        fields={[
          { key: 'label', label: 'Button text' },
          { key: 'href', label: 'Redirect link' },
          { key: 'key', label: 'Puzzle key' },
          { key: 'variant', label: 'Variant', kind: 'select', options: ['solid', 'ghost'] },
        ]}
        styleFields
        onDragStart={onDragStart}
        dragPayload={dragPayload}
        onDragEnd={onDragEnd}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onUpdateStyle={onUpdateStyle}
        onRemove={onRemove}
        onMove={onMove}
        onDuplicate={onDuplicate}
      />

      <ListBlock
        title="Method cards"
        path="method.steps"
        items={steps}
        addLabel="+ card"
        template={newStep()}
        fields={[
          { key: 'title', label: 'Title' },
          { key: 'body', label: 'Body', kind: 'textarea' },
        ]}
        onDragStart={onDragStart}
        dragPayload={dragPayload}
        onDragEnd={onDragEnd}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onUpdateStyle={onUpdateStyle}
        onRemove={onRemove}
        onMove={onMove}
        onDuplicate={onDuplicate}
      />

      <ListBlock
        title="Content boxes / banners"
        path="home.sections"
        items={sections}
        addLabel="+ banner / content box"
        template={sectionFromTemplate(SECTION_TEMPLATES[0])}
        fields={[
          { key: 'id', label: 'ID' },
          { key: 'variant', label: 'Variant', kind: 'select', options: SECTION_TEMPLATES.map((tpl) => tpl.id) },
          { key: 'enabled', label: 'Enabled', kind: 'select', options: ['true', 'false'] },
          { key: 'eyebrow', label: 'Eyebrow' },
          { key: 'title', label: 'Title' },
          { key: 'body', label: 'Body', kind: 'textarea' },
          { key: 'mediaUrl', label: 'Media URL' },
          { key: 'ctaLabel', label: 'CTA text' },
          { key: 'ctaHref', label: 'CTA redirect' },
        ]}
        onDragStart={onDragStart}
        dragPayload={dragPayload}
        onDragEnd={onDragEnd}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onUpdateStyle={onUpdateStyle}
        onRemove={onRemove}
        onMove={onMove}
        onDuplicate={onDuplicate}
      />

      <ListBlock
        title="Dynamic pages"
        path="pages"
        items={pages}
        addLabel="+ page"
        template={newPage()}
        fields={[
          { key: 'slug', label: 'URL slug' },
          { key: 'enabled', label: 'Enabled', kind: 'select', options: ['true', 'false'] },
          { key: 'navLabel', label: 'Menu label' },
          { key: 'eyebrow', label: 'Eyebrow' },
          { key: 'title', label: 'Title' },
          { key: 'body', label: 'Body', kind: 'textarea' },
          { key: 'ctaLabel', label: 'CTA text' },
          { key: 'ctaHref', label: 'CTA redirect' },
        ]}
        onDragStart={onDragStart}
        dragPayload={dragPayload}
        onDragEnd={onDragEnd}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onUpdateStyle={onUpdateStyle}
        onRemove={onRemove}
        onMove={onMove}
        onDuplicate={onDuplicate}
      />

      <ListBlock
        title="Footer columns"
        path="footer.columns"
        items={footerColumns}
        addLabel="+ footer column"
        template={newFooterColumn()}
        fields={[
          { key: 'title', label: 'Column title' },
        ]}
        onDragStart={onDragStart}
        dragPayload={dragPayload}
        onDragEnd={onDragEnd}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onUpdateStyle={onUpdateStyle}
        onRemove={onRemove}
        onMove={onMove}
        onDuplicate={onDuplicate}
      />
    </>
  );
}

function TemplateLibrary({ onDragStart, onDragEnd, onAdd }) {
  return (
    <Section title="Element library · 10 templates">
      <p style={templateHelp}>
        Drag ไปวางที่รายการ Content boxes หรือวางทับ content box ใน iframe เพื่อสร้าง block ใหม่
      </p>
      <div style={templateGrid}>
        {SECTION_TEMPLATES.map((template) => {
          const item = sectionFromTemplate(template);
          return (
            <button
              key={template.id}
              type="button"
              draggable
              onDragStart={(e) => {
                const payload = { type: 'template', path: 'home.sections', item };
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('application/x-blot-template', JSON.stringify(payload));
                e.dataTransfer.setData('text/plain', template.label);
                onDragStart(payload);
              }}
              onDragEnd={onDragEnd}
              onClick={() => onAdd(template)}
              style={templateCard}
            >
              <strong>{template.label}</strong>
              <span>{template.description}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function ListBlock({
  title,
  path,
  items,
  addLabel,
  template,
  fields,
  styleFields,
  onDragStart,
  dragPayload,
  onDragEnd,
  onAdd,
  onUpdate,
  onUpdateStyle,
  onRemove,
  onMove,
  onDuplicate,
}) {
  return (
    <Section title={`${title} · ${items.length}`}>
      <button type="button" style={inlineAdd} onClick={() => onAdd(path, template, 0)}>
        + Add at top
      </button>
      <div
        style={{ display: 'grid', gap: 10, marginTop: 10 }}
        onDragOver={(e) => {
          if (dragPayload?.type === 'template' && dragPayload.path === path) e.preventDefault();
        }}
        onDrop={(e) => {
          if (dragPayload?.type !== 'template' || dragPayload.path !== path) return;
          e.preventDefault();
          e.stopPropagation();
          onAdd(path, dragPayload.item, items.length);
          onDragEnd();
        }}
      >
        {items.map((item, index) => (
          <div
            key={`${path}-${index}`}
            draggable
            onDragStart={(e) => {
              const payload = { type: 'item', path, index, id: stableItemId(item, index) };
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', JSON.stringify(payload));
              onDragStart(payload);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (dragPayload?.type === 'template' && dragPayload.path === path) {
                onAdd(path, dragPayload.item, index);
              } else if (dragPayload?.path === path) {
                onMove(path, dragPayload.index, index, dragPayload.id, stableItemId(item, index));
              }
              onDragEnd();
            }}
            onDragEnd={onDragEnd}
            style={structureCard}
          >
            <div style={structureHead}>
              <span style={dragHandle}>drag · #{index + 1}</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button type="button" style={miniControl} onClick={() => onAdd(path, template, index)}>+ before</button>
                <button type="button" style={miniControl} onClick={() => onAdd(path, template, index + 1)}>+ after</button>
                <button type="button" style={miniControl} onClick={() => onDuplicate(path, index, 1)}>+ right</button>
                <button type="button" style={miniControl} onClick={() => onRemove(path, index)}>Delete</button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {fields.map((field) => (
                <FieldRow key={field.key} label={field.label}>
                  <StructureInput
                    field={field}
                    value={item?.[field.key] ?? ''}
                    onChange={(value) => onUpdate(path, index, { [field.key]: value })}
                  />
                </FieldRow>
              ))}
            </div>

            {styleFields && (
              <details style={{ marginTop: 8 }}>
                <summary style={styleSummary}>Typography / button style</summary>
                <FieldRow label="Font">
                  <input
                    type="text"
                    value={item.style?.fontFamily || ''}
                    onChange={(e) => onUpdateStyle(path, index, 'fontFamily', e.target.value)}
                    style={{ ...textInput, flex: 1 }}
                    placeholder="'Inter', sans-serif"
                  />
                </FieldRow>
                <FieldRow label="Size / weight">
                  <input
                    type="text"
                    value={item.style?.fontSize || ''}
                    onChange={(e) => onUpdateStyle(path, index, 'fontSize', e.target.value)}
                    style={{ ...textInput, width: 92 }}
                    placeholder="12px"
                  />
                  <select
                    value={item.style?.fontWeight || ''}
                    onChange={(e) => onUpdateStyle(path, index, 'fontWeight', e.target.value)}
                    style={{ ...textInput, width: 94 }}
                  >
                    <option value="">weight</option>
                    {FONT_WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </FieldRow>
                <FieldRow label="Spacing / case">
                  <input
                    type="text"
                    value={item.style?.letterSpacing || ''}
                    onChange={(e) => onUpdateStyle(path, index, 'letterSpacing', e.target.value)}
                    style={{ ...textInput, width: 92 }}
                    placeholder=".18em"
                  />
                  <select
                    value={item.style?.textTransform || ''}
                    onChange={(e) => onUpdateStyle(path, index, 'textTransform', e.target.value)}
                    style={{ ...textInput, width: 130 }}
                  >
                    <option value="">case</option>
                    <option value="none">none</option>
                    <option value="uppercase">uppercase</option>
                    <option value="capitalize">capitalize</option>
                  </select>
                </FieldRow>
              </details>
            )}

            <button type="button" style={inlineAdd} onClick={() => onAdd(path, template, index + 1)}>
              {addLabel} below
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <button type="button" style={emptyAdd} onClick={() => onAdd(path, template, 0)}>
            {addLabel}
          </button>
        )}
      </div>
    </Section>
  );
}

function StructureInput({ field, value, onChange }) {
  if (field.kind === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        style={{ ...textInput, flex: 1, resize: 'vertical' }}
      />
    );
  }
  if (field.kind === 'select') {
    return (
      <select value={String(value)} onChange={(e) => onChange(e.target.value)} style={{ ...textInput, flex: 1 }}>
        {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...textInput, flex: 1 }}
    />
  );
}

function newNavItem() {
  const id = `menu-${Date.now().toString(36)}`;
  return { key: id, label: 'New menu', href: '/', style: {} };
}
function newCta() {
  const id = `cta-${Date.now().toString(36)}`;
  return { key: id, label: 'New CTA', href: '/quiz', variant: 'solid', style: {} };
}
function newStep() {
  return { title: 'New card', body: 'Describe this step or content card.' };
}
function newSection() {
  return sectionFromTemplate(SECTION_TEMPLATES[0]);
}
function newPage() {
  const id = `page-${Date.now().toString(36)}`;
  return {
    slug: id,
    enabled: false,
    navLabel: 'New page',
    eyebrow: 'CMS Page',
    title: 'New page',
    body: 'Write page content here.',
    ctaLabel: 'Start the quiz →',
    ctaHref: '/quiz',
  };
}
function newFooterColumn() {
  return {
    title: 'New column',
    links: [
      { label: 'New link', href: '/' },
    ],
  };
}
function sectionFromTemplate(template = SECTION_TEMPLATES[0]) {
  const id = `section-${template.id}-${Date.now().toString(36)}`;
  return {
    id,
    variant: template.id,
    enabled: true,
    eyebrow: template.eyebrow || 'New section',
    title: template.title || 'New content box',
    body: template.body || 'Write the message for this section.',
    mediaUrl: template.mediaUrl || '',
    ctaLabel: template.ctaLabel || 'Open ->',
    ctaHref: template.ctaHref || '/quiz',
  };
}
function stableItemId(item, index = 0) {
  if (!item || typeof item !== 'object') return index;
  return item.id ?? item.key ?? item.slug ?? item.href ?? item.title ?? index;
}
function sanitizeStructureItem(item) {
  const next = deepClone(item || {});
  if (next.variant && !next.id) next.id = `section-${next.variant}-${Date.now().toString(36)}`;
  return next;
}
function templateForPath(path) {
  if (/^footer\.columns\.\d+\.links$/.test(path)) {
    return { label: 'New link', href: '/' };
  }
  switch (path) {
    case 'navigation.items': return newNavItem();
    case 'navigation.ctas': return newCta();
    case 'method.steps': return newStep();
    case 'home.sections': return newSection();
    case 'pages': return newPage();
    case 'footer.columns': return newFooterColumn();
    default: return {};
  }
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

function pushPreview(iframeEl, draft, mode = 'element') {
  if (!iframeEl?.contentWindow) return;
  const textMap = collectTextOverrides(draft);
  iframeEl.contentWindow.postMessage(
    {
      type: 'blot-preview',
      mode,
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
  if (Array.isArray(node)) {
    // Walk arrays too — JSX tags like `method.steps.${i}.title` produce
    // indexed edit-keys, and we want those to count as text-keys (so the
    // inspector shows the textarea, not the "style only" notice).
    node.forEach((item, i) => {
      const next = path ? `${path}.${i}` : String(i);
      walkStrings(item, next, onLeaf);
    });
    return;
  }
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
const dynamicNotice = {
  padding: '10px 12px',
  background: 'var(--offwhite)',
  border: '1px dashed var(--grey-4)',
  borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font-sans)',
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
const previewCanvas = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'stretch',
  overflow: 'auto',
  padding: 12,
  background: 'linear-gradient(135deg, var(--offwhite), var(--paper))',
  border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-md)',
};

const deviceSwitch = {
  display: 'inline-flex',
  padding: 4,
  gap: 2,
  border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--offwhite)',
};
const deviceBtn = {
  padding: '6px 10px',
  border: '1px solid transparent',
  borderRadius: 'var(--radius-pill)',
  background: 'transparent',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};
const deviceBtnActive = { background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' };

const trashZone = {
  display: 'grid',
  gap: 4,
  placeItems: 'center',
  textAlign: 'center',
  padding: '18px 14px',
  border: '1px dashed var(--grey-4)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--offwhite)',
  color: 'var(--grey-2)',
};
const trashZoneHot = {
  borderColor: '#b91c1c',
  background: '#fef2f2',
  color: '#b91c1c',
};
const trashIcon = { fontSize: 24, lineHeight: 1 };
const templateHelp = {
  margin: '0 0 10px',
  fontSize: 12,
  color: 'var(--grey-2)',
  lineHeight: 1.55,
};
const templateGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
};
const templateCard = {
  display: 'grid',
  gap: 4,
  textAlign: 'left',
  padding: 10,
  border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--paper)',
  cursor: 'grab',
};

const structureCard = {
  padding: 12,
  border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--offwhite)',
};
const structureHead = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  alignItems: 'center',
  marginBottom: 10,
  flexWrap: 'wrap',
};
const dragHandle = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--grey-3)',
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  cursor: 'grab',
};
const miniControl = {
  padding: '4px 7px',
  border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--paper)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};
const inlineAdd = {
  marginTop: 8,
  width: '100%',
  padding: '7px 10px',
  border: '1px dashed var(--grey-4)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--paper)',
  color: 'var(--grey-2)',
  cursor: 'pointer',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
};
const emptyAdd = { ...inlineAdd, marginTop: 0, minHeight: 54 };
const styleSummary = {
  cursor: 'pointer',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: 'var(--grey-2)',
  margin: '8px 0',
};

const toggleWrap = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.2em',
  textTransform: 'uppercase', color: 'var(--grey-2)',
};

const okBox  = { padding: '10px 14px', border: '1px solid var(--ink)',     background: 'var(--ink)',     color: 'var(--paper)', borderRadius: 'var(--radius-sm)', fontSize: 13 };
const errBox = { padding: '10px 14px', border: '1px solid #b91c1c',        background: '#fef2f2',        color: '#b91c1c',      borderRadius: 'var(--radius-sm)', fontSize: 13 };
const infoBox = { padding: '10px 14px', border: '1px solid var(--grey-5)', background: 'var(--offwhite)', color: 'var(--grey-2)', borderRadius: 'var(--radius-sm)', fontSize: 13 };
