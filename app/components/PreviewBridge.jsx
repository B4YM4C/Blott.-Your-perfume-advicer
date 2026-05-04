'use client';

import { useEffect } from 'react';
import { THEME_TO_VAR, STYLE_PROP_TO_CSS } from '@/lib/theme';

/**
 * PreviewBridge — runs inside every public page. When the URL has
 * `?preview=1` it activates and:
 *
 *   1. Decorates every `[data-edit-key]` element with a hover outline
 *      and a click handler. Clicking sends the parent window:
 *         { type: 'blot-pick', key, text, rect: {top,left,width,height} }
 *
 *   2. Applies live overrides from the parent:
 *         { type: 'blot-preview', theme:{...}, styles:{key:{prop:value}}, text:{key:value} }
 *      Theme writes CSS variables on `<html>`. Per-element styles are
 *      written to a managed `<style id="blot-preview-styles">` block.
 *      Text overrides DOM-mutate the matching elements.
 *
 *   3. Sends `{ type: 'blot-preview-ready' }` once, on mount, so the
 *      editor knows it can push the initial draft.
 */
export default function PreviewBridge() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') !== '1') return;

    const root = document.documentElement;
    const styleEl = document.createElement('style');
    styleEl.id = 'blot-preview-styles';
    document.head.appendChild(styleEl);

    // Inject the hover/select chrome — only inside the preview iframe.
    const chrome = document.createElement('style');
    chrome.id = 'blot-preview-chrome';
    chrome.textContent = `
      [data-edit-key] {
        outline: 1px dashed transparent;
        outline-offset: 2px;
        cursor: pointer;
        transition: outline-color .12s ease;
      }
      [data-edit-key]:hover {
        outline-color: rgba(10,10,10,.55);
      }
      [data-edit-key][data-blot-selected="1"] {
        outline: 2px solid var(--ink, #0a0a0a);
        outline-offset: 3px;
      }
      html[data-blot-structure="1"] [data-structure-list] {
        outline: 2px solid rgba(10,10,10,.42);
        outline-offset: 5px;
        cursor: grab !important;
      }
      html[data-blot-structure="1"] [data-structure-list]:hover {
        outline-color: rgba(10,10,10,.82);
      }
      html[data-blot-structure="1"] [data-structure-list][data-blot-drop="1"] {
        outline-color: #14532d;
        box-shadow: 0 0 0 6px rgba(20,83,45,.12);
      }
      .blot-structure-overlay {
        position: absolute;
        z-index: 99998;
        display: inline-flex;
        gap: 4px;
        padding: 4px;
        border: 1px solid rgba(10,10,10,.18);
        border-radius: 999px;
        background: rgba(255,255,255,.94);
        box-shadow: 0 10px 26px rgba(10,10,10,.16);
        backdrop-filter: blur(8px);
      }
      .blot-structure-overlay button {
        border: 1px solid rgba(10,10,10,.14);
        border-radius: 999px;
        background: #fff;
        color: #0a0a0a;
        min-width: 28px;
        height: 28px;
        padding: 0 8px;
        font: 600 10px Inter, system-ui, sans-serif;
        cursor: pointer;
      }
      .blot-structure-overlay button:hover {
        background: #0a0a0a;
        color: #fff;
      }
      .blot-structure-trash {
        position: fixed;
        left: 50%;
        bottom: 18px;
        z-index: 99999;
        transform: translateX(-50%);
        min-width: 172px;
        min-height: 54px;
        display: none;
        place-items: center;
        gap: 2px;
        padding: 8px 18px;
        border-radius: 999px;
        background: rgba(10,10,10,.88);
        color: #fff;
        box-shadow: 0 20px 50px rgba(10,10,10,.32);
        font-family: Inter, system-ui, sans-serif;
        text-align: center;
        pointer-events: auto;
      }
      html[data-blot-structure="1"] .blot-structure-trash {
        display: grid;
      }
      .blot-structure-trash.is-hot {
        background: #b91c1c;
        transform: translateX(-50%) scale(1.04);
      }
      .blot-structure-trash strong {
        display: block;
        font-size: 12px;
        line-height: 1.1;
      }
      .blot-structure-trash small {
        display: block;
        font-size: 10px;
        opacity: .72;
      }
      .blot-structure-dragging {
        opacity: .42 !important;
      }
    `;
    document.head.appendChild(chrome);

    // Snapshot original CSS variable values so reset() is exact.
    const original = {};
    for (const cssVar of Object.values(THEME_TO_VAR)) {
      original[cssVar] = root.style.getPropertyValue(cssVar) || '';
    }
    // Snapshot original textContent for every editable element so the
    // editor's text overrides can be reset cleanly.
    const originalText = new WeakMap();
    document.querySelectorAll('[data-edit-key]').forEach((el) => {
      originalText.set(el, el.textContent);
    });

    const STRUCTURE_SELECTOR = '[data-structure-list][data-structure-index]';
    let structureMode = false;
    let dragPayload = null;
    let dragEl = null;
    let rebuildFrame = 0;
    let overlayEls = [];
    const trashEl = document.createElement('div');
    trashEl.className = 'blot-structure-trash';
    trashEl.setAttribute('data-blot-preview-control', 'true');
    trashEl.innerHTML = '<strong>Delete</strong><small>drag here</small>';
    document.body.appendChild(trashEl);

    function applyTheme(theme) {
      if (!theme || typeof theme !== 'object') return;
      for (const [key, value] of Object.entries(theme)) {
        const cssVar = THEME_TO_VAR[key];
        if (!cssVar) continue;
        if (value == null || value === '') root.style.removeProperty(cssVar);
        else                                root.style.setProperty(cssVar, String(value));
      }
    }

    function applyStyles(styles) {
      if (!styles || typeof styles !== 'object') {
        styleEl.textContent = '';
        return;
      }
      const rules = [];
      for (const [key, props] of Object.entries(styles)) {
        if (!props || typeof props !== 'object') continue;
        const decls = [];
        for (const [propKey, value] of Object.entries(props)) {
          const cssProp = STYLE_PROP_TO_CSS[propKey];
          if (!cssProp) continue;
          if (value == null || value === '') continue;
          decls.push(`${cssProp}: ${String(value).replace(/[{}<>]/g, '')};`);
        }
        if (!decls.length) continue;
        const safeKey = String(key).replace(/[^a-zA-Z0-9._-]/g, '');
        rules.push(`[data-edit-key="${safeKey}"] { ${decls.join(' ')} }`);
      }
      styleEl.textContent = rules.join('\n');
    }

    function applyText(textMap) {
      if (!textMap || typeof textMap !== 'object') return;
      for (const [key, value] of Object.entries(textMap)) {
        const safeKey = String(key).replace(/[^a-zA-Z0-9._-]/g, '');
        document.querySelectorAll(`[data-edit-key="${safeKey}"]`).forEach((el) => {
          // Preserve the original on first override so we can revert.
          if (!originalText.has(el)) originalText.set(el, el.textContent);
          el.textContent = value == null ? originalText.get(el) : String(value);
        });
      }
    }

    function resetAll() {
      for (const [cssVar, originalValue] of Object.entries(original)) {
        if (originalValue) root.style.setProperty(cssVar, originalValue);
        else root.style.removeProperty(cssVar);
      }
      styleEl.textContent = '';
      document.querySelectorAll('[data-edit-key]').forEach((el) => {
        if (originalText.has(el)) el.textContent = originalText.get(el);
      });
    }

    function clearSelection() {
      document.querySelectorAll('[data-edit-key][data-blot-selected="1"]').forEach((el) => {
        el.removeAttribute('data-blot-selected');
      });
    }

    function post(type, payload = {}) {
      window.parent?.postMessage({ type, ...payload }, window.location.origin);
    }

    function structureItems() {
      return [...document.querySelectorAll(STRUCTURE_SELECTOR)].filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    }

    function metaFor(el) {
      return {
        path: el?.getAttribute('data-structure-list') || '',
        index: Number(el?.getAttribute('data-structure-index') || 0),
        id: el?.getAttribute('data-structure-id') || '',
        kind: el?.getAttribute('data-structure-kind') || 'item',
      };
    }

    function setStructureMode(next) {
      structureMode = !!next;
      if (structureMode) {
        root.setAttribute('data-blot-structure', '1');
        structureItems().forEach((el) => el.setAttribute('draggable', 'true'));
        scheduleStructureOverlays();
      } else {
        root.removeAttribute('data-blot-structure');
        document.querySelectorAll(STRUCTURE_SELECTOR).forEach((el) => el.removeAttribute('draggable'));
        clearStructureOverlays();
        trashEl.classList.remove('is-hot');
      }
    }

    function clearStructureOverlays() {
      overlayEls.forEach((el) => el.remove());
      overlayEls = [];
      document.querySelectorAll('[data-blot-drop="1"]').forEach((el) => el.removeAttribute('data-blot-drop'));
    }

    function scheduleStructureOverlays() {
      if (!structureMode) return;
      window.cancelAnimationFrame(rebuildFrame);
      rebuildFrame = window.requestAnimationFrame(rebuildStructureOverlays);
    }

    function rebuildStructureOverlays() {
      if (!structureMode) return;
      clearStructureOverlays();
      for (const el of structureItems()) {
        el.setAttribute('draggable', 'true');
        const meta = metaFor(el);
        if (!meta.path) continue;
        const rect = el.getBoundingClientRect();
        const overlay = document.createElement('div');
        overlay.className = 'blot-structure-overlay';
        overlay.setAttribute('data-blot-preview-control', 'true');
        overlay.style.top = `${window.scrollY + rect.top - 16}px`;
        overlay.style.left = `${Math.max(window.scrollX + 8, Math.min(window.scrollX + rect.right - 238, window.scrollX + window.innerWidth - 248))}px`;
        overlay.innerHTML = `
          <button type="button" data-action="before" title="Add new item before">+↑</button>
          <button type="button" data-action="duplicate" title="Clone this item">Clone +</button>
          <button type="button" data-action="after" title="Add new item after">+↓</button>
          <button type="button" data-action="edit" title="Edit text/style in Element tab">Edit</button>
        `;
        overlay.addEventListener('click', (ev) => {
          const btn = ev.target.closest('button');
          if (!btn) return;
          ev.preventDefault();
          ev.stopPropagation();
          const action = btn.dataset.action;
          if (action === 'edit') {
            pickElement(el.querySelector('[data-edit-key]') || el);
            return;
          }
          if (action === 'duplicate') {
            clonePreviewNode(el, 'after');
            post('blot-structure-add', { path: meta.path, index: meta.index, id: meta.id, mode: 'duplicate' });
            return;
          }
          clonePreviewNode(el, action === 'before' ? 'before' : 'after', true);
          post('blot-structure-add', { path: meta.path, index: meta.index, id: meta.id, where: action === 'before' ? 'before' : 'after' });
        });
        document.body.appendChild(overlay);
        overlayEls.push(overlay);
      }
    }

    function pickElement(el) {
      if (!el) return;
      const editEl = el.matches('[data-edit-key]') ? el : el.querySelector('[data-edit-key]');
      if (!editEl) return;
      clearSelection();
      editEl.setAttribute('data-blot-selected', '1');
      const rect = editEl.getBoundingClientRect();
      const computed = window.getComputedStyle(editEl);
      post('blot-pick', {
        key: editEl.getAttribute('data-edit-key'),
        text: editEl.textContent || '',
        computed: {
          color: rgbToHex(computed.color),
          fontFamily: computed.fontFamily,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          letterSpacing: computed.letterSpacing,
        },
        rect: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        },
      });
    }

    function clonePreviewNode(el, where, markNew = false) {
      const clone = el.cloneNode(true);
      clone.removeAttribute('data-blot-selected');
      clone.classList.remove('blot-structure-dragging');
      clone.querySelectorAll('[data-blot-selected]').forEach((x) => x.removeAttribute('data-blot-selected'));
      if (markNew) {
        clone.style.opacity = '.72';
        const firstText = clone.querySelector('[data-edit-key]');
        if (firstText) firstText.textContent = labelForPath(metaFor(el).path);
      }
      if (where === 'before') el.parentNode?.insertBefore(clone, el);
      else el.parentNode?.insertBefore(clone, el.nextSibling);
      updateVisibleIndexes(metaFor(el).path);
      scheduleStructureOverlays();
    }

    function labelForPath(path) {
      if (path === 'navigation.items') return 'New menu';
      if (path === 'navigation.ctas') return 'New CTA';
      if (path === 'method.steps') return 'New card';
      if (path === 'home.sections') return 'New content box';
      if (/^footer\.columns\.\d+\.links$/.test(path)) return 'New link';
      if (path === 'footer.columns') return 'New footer column';
      return 'New item';
    }

    function updateVisibleIndexes(path) {
      structureItems()
        .filter((el) => el.getAttribute('data-structure-list') === path)
        .forEach((el, index) => el.setAttribute('data-structure-index', String(index)));
    }

    function movePreviewNode(source, target) {
      if (!source || !target || source === target || source.parentNode !== target.parentNode) return;
      const from = metaFor(source).index;
      const to = metaFor(target).index;
      if (from < to) target.parentNode.insertBefore(source, target.nextSibling);
      else target.parentNode.insertBefore(source, target);
      updateVisibleIndexes(metaFor(source).path);
      scheduleStructureOverlays();
    }

    // ---- Click-to-pick ---------------------------------------------
    function onClickCapture(ev) {
      if (ev.target.closest('[data-blot-preview-control="true"]')) return;
      const el = ev.target.closest('[data-edit-key]');
      if (!el) return;
      // Block default for anchors / buttons so the iframe doesn't
      // navigate while the user is editing.
      ev.preventDefault();
      ev.stopPropagation();
      clearSelection();
      pickElement(el);
    }
    document.addEventListener('click', onClickCapture, true);

    function onDragStart(ev) {
      if (!structureMode || ev.target.closest('[data-blot-preview-control="true"]')) return;
      const el = ev.target.closest(STRUCTURE_SELECTOR);
      if (!el) return;
      dragEl = el;
      dragPayload = metaFor(el);
      el.classList.add('blot-structure-dragging');
      ev.dataTransfer.effectAllowed = 'move';
      ev.dataTransfer.setData('text/plain', JSON.stringify(dragPayload));
    }

    function onDragOver(ev) {
      if (!structureMode) return;
      if (trashEl.contains(ev.target)) {
        if (!dragPayload) return;
        ev.preventDefault();
        trashEl.classList.add('is-hot');
        return;
      }
      const el = ev.target.closest(STRUCTURE_SELECTOR);
      if (!el) return;
      const meta = metaFor(el);
      const externalTemplate = !dragPayload && hasExternalTemplate(ev);
      if (!externalTemplate && meta.path !== dragPayload?.path) return;
      if (externalTemplate && meta.path !== 'home.sections') return;
      ev.preventDefault();
      document.querySelectorAll('[data-blot-drop="1"]').forEach((x) => x.removeAttribute('data-blot-drop'));
      el.setAttribute('data-blot-drop', '1');
    }

    function onDrop(ev) {
      if (!structureMode) return;
      if (trashEl.contains(ev.target)) {
        if (!dragPayload) return;
        ev.preventDefault();
        if (dragEl) {
          const meta = dragPayload;
          dragEl.remove();
          updateVisibleIndexes(meta.path);
          post('blot-structure-remove', meta);
        }
        clearDragState();
        return;
      }
      const el = ev.target.closest(STRUCTURE_SELECTOR);
      if (!el) return;
      const meta = metaFor(el);
      if (!dragPayload) {
        const templatePayload = readExternalTemplate(ev);
        if (!templatePayload || meta.path !== templatePayload.path) return;
        ev.preventDefault();
        clonePreviewNode(el, 'after', true);
        post('blot-structure-add-template', {
          path: meta.path,
          index: meta.index,
          id: meta.id,
          where: 'after',
          item: templatePayload.item,
        });
        clearDragState();
        return;
      }
      if (meta.path !== dragPayload.path) return;
      ev.preventDefault();
      const from = dragPayload.index;
      const to = meta.index;
      movePreviewNode(dragEl, el);
      post('blot-structure-move', { path: meta.path, from, to, fromId: dragPayload.id, toId: meta.id });
      clearDragState();
    }

    function onDragEnd() {
      clearDragState();
    }

    function clearDragState() {
      dragEl?.classList.remove('blot-structure-dragging');
      dragEl = null;
      dragPayload = null;
      trashEl.classList.remove('is-hot');
      document.querySelectorAll('[data-blot-drop="1"]').forEach((x) => x.removeAttribute('data-blot-drop'));
      scheduleStructureOverlays();
    }

    function hasExternalTemplate(ev) {
      return Array.from(ev.dataTransfer?.types || []).includes('application/x-blot-template');
    }

    function readExternalTemplate(ev) {
      if (!hasExternalTemplate(ev)) return null;
      try {
        return JSON.parse(ev.dataTransfer.getData('application/x-blot-template') || 'null');
      } catch (_) {
        return null;
      }
    }

    trashEl.addEventListener('dragover', onDragOver);
    trashEl.addEventListener('drop', onDrop);
    trashEl.addEventListener('dragleave', () => trashEl.classList.remove('is-hot'));
    document.addEventListener('dragstart', onDragStart, true);
    document.addEventListener('dragover', onDragOver, true);
    document.addEventListener('drop', onDrop, true);
    document.addEventListener('dragend', onDragEnd, true);
    window.addEventListener('scroll', scheduleStructureOverlays, true);
    window.addEventListener('resize', scheduleStructureOverlays);

    // ---- postMessage from parent -----------------------------------
    function onMessage(ev) {
      if (ev.origin !== window.location.origin) return;
      const data = ev.data;
      if (!data || typeof data !== 'object') return;
      switch (data.type) {
        case 'blot-preview':
          if ('mode' in data) setStructureMode(data.mode === 'structure');
          if ('theme'  in data) applyTheme(data.theme);
          if ('styles' in data) applyStyles(data.styles);
          if ('text'   in data) applyText(data.text);
          break;
        case 'blot-preview-reset':
          resetAll();
          clearSelection();
          break;
        case 'blot-preview-select':
          clearSelection();
          if (data.key) {
            document.querySelectorAll(`[data-edit-key="${String(data.key).replace(/[^a-zA-Z0-9._-]/g, '')}"]`)
              .forEach((el) => el.setAttribute('data-blot-selected', '1'));
          }
          break;
      }
    }
    window.addEventListener('message', onMessage);

    // Tell the parent we're ready to receive the first push.
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'blot-preview-ready' }, window.location.origin);
    }
    document.documentElement.setAttribute('data-blot-preview', '1');

    return () => {
      document.removeEventListener('click', onClickCapture, true);
      document.removeEventListener('dragstart', onDragStart, true);
      document.removeEventListener('dragover', onDragOver, true);
      document.removeEventListener('drop', onDrop, true);
      document.removeEventListener('dragend', onDragEnd, true);
      window.removeEventListener('scroll', scheduleStructureOverlays, true);
      window.removeEventListener('resize', scheduleStructureOverlays);
      window.removeEventListener('message', onMessage);
      styleEl.remove();
      chrome.remove();
      clearStructureOverlays();
      trashEl.remove();
      document.documentElement.removeAttribute('data-blot-preview');
      document.documentElement.removeAttribute('data-blot-structure');
      resetAll();
    };
  }, []);

  return null;
}

// Convert "rgb(10, 10, 10)" → "#0a0a0a" so the editor's <input type=color>
// can show the current value without surprising the user.
function rgbToHex(rgb) {
  if (!rgb) return '';
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb);
  if (!m) return rgb;
  const toHex = (n) => Number(n).toString(16).padStart(2, '0');
  return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
}
