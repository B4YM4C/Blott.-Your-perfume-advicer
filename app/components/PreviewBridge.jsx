'use client';

import { useEffect } from 'react';
import { THEME_TO_VAR } from '@/lib/theme';

/**
 * PreviewBridge — listens for live theme overrides posted from the
 * /admin/site-editor parent window. Activates only when the URL has
 * `?preview=1`, and is otherwise a no-op zero-render component.
 *
 * Protocol (window.postMessage from parent → child iframe):
 *   { type: 'blot-preview', theme: { ink: '#...', ... } }
 *   { type: 'blot-preview-reset' }                        // restore defaults
 *
 * We also send `{ type: 'blot-preview-ready' }` back to the parent on
 * mount so the editor can push the current draft immediately.
 */
export default function PreviewBridge() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') !== '1') return;

    const root = document.documentElement;
    // Snapshot the original computed values so we can restore on reset.
    const original = {};
    for (const cssVar of Object.values(THEME_TO_VAR)) {
      original[cssVar] = root.style.getPropertyValue(cssVar) || '';
    }

    function applyTheme(theme) {
      if (!theme || typeof theme !== 'object') return;
      for (const [key, value] of Object.entries(theme)) {
        const cssVar = THEME_TO_VAR[key];
        if (!cssVar) continue;
        if (value == null || value === '') {
          root.style.removeProperty(cssVar);
        } else {
          root.style.setProperty(cssVar, String(value));
        }
      }
    }
    function resetTheme() {
      for (const [cssVar, original_value] of Object.entries(original)) {
        if (original_value) root.style.setProperty(cssVar, original_value);
        else root.style.removeProperty(cssVar);
      }
    }

    function onMessage(ev) {
      // Same-origin only — Vercel/Localhost; we don't accept cross-origin
      // because the editor loads from /admin on the same host.
      if (ev.origin !== window.location.origin) return;
      const data = ev.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'blot-preview')        applyTheme(data.theme);
      else if (data.type === 'blot-preview-reset') resetTheme();
    }
    window.addEventListener('message', onMessage);

    // Tell the parent we're ready to receive the first push.
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'blot-preview-ready' }, window.location.origin);
    }
    // A small visual hint so it's obvious we're inside the editor.
    document.documentElement.setAttribute('data-blot-preview', '1');

    return () => {
      window.removeEventListener('message', onMessage);
      document.documentElement.removeAttribute('data-blot-preview');
      resetTheme();
    };
  }, []);

  return null;
}
