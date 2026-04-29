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

    // ---- Click-to-pick ---------------------------------------------
    function onClickCapture(ev) {
      const el = ev.target.closest('[data-edit-key]');
      if (!el) return;
      // Block default for anchors / buttons so the iframe doesn't
      // navigate while the user is editing.
      ev.preventDefault();
      ev.stopPropagation();
      clearSelection();
      el.setAttribute('data-blot-selected', '1');
      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);
      window.parent?.postMessage(
        {
          type: 'blot-pick',
          key:  el.getAttribute('data-edit-key'),
          text: el.textContent || '',
          computed: {
            color:        rgbToHex(computed.color),
            fontFamily:   computed.fontFamily,
            fontSize:     computed.fontSize,
            fontWeight:   computed.fontWeight,
            letterSpacing: computed.letterSpacing,
          },
          rect: {
            top:   rect.top + window.scrollY,
            left:  rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
          },
        },
        window.location.origin,
      );
    }
    document.addEventListener('click', onClickCapture, true);

    // ---- postMessage from parent -----------------------------------
    function onMessage(ev) {
      if (ev.origin !== window.location.origin) return;
      const data = ev.data;
      if (!data || typeof data !== 'object') return;
      switch (data.type) {
        case 'blot-preview':
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
      window.removeEventListener('message', onMessage);
      styleEl.remove();
      chrome.remove();
      document.documentElement.removeAttribute('data-blot-preview');
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
