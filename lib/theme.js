/**
 * Theme helpers — translate the editable theme object stored in
 * `site_copy.data.theme` into CSS-variable overrides we can drop into a
 * `<style>` tag in the document head, OR push live to a preview iframe.
 *
 * The mapping is intentionally narrow: a small set of brand colours +
 * typography + two scale knobs. Anything outside this map is ignored so
 * the editor can't break unrelated layout tokens.
 */

// Maps theme-object keys → CSS variable names used in globals.css.
export const THEME_TO_VAR = {
  ink:           '--ink',
  paper:         '--paper',
  offwhite:      '--offwhite',
  grey1:         '--grey-1',
  grey2:         '--grey-2',
  grey3:         '--grey-3',
  grey4:         '--grey-4',
  grey5:         '--grey-5',
  fontSerif:     '--font-serif',
  fontSans:      '--font-sans',
  fontMono:      '--font-mono',
  // headlineScale + bodyScale are applied separately as transforms on
  // the existing `--font-...-size` tokens via inline calc(); see below.
};

/** Returns the CSS rule body (no surrounding `<style>` / selector) that
 *  redefines `:root` variables based on the theme object. Skips keys we
 *  don't recognise and any value that's empty / null. */
export function themeToCssVars(theme = {}) {
  if (!theme || typeof theme !== 'object') return '';
  const lines = [];
  for (const [key, value] of Object.entries(theme)) {
    const cssVar = THEME_TO_VAR[key];
    if (!cssVar) continue;
    if (value == null || value === '') continue;
    lines.push(`  ${cssVar}: ${escapeCssValue(value)};`);
  }
  return lines.length ? `:root {\n${lines.join('\n')}\n}` : '';
}

/** Same map but emitted as { '--ink': '#000', ... } so a client component
 *  can apply it via `document.documentElement.style.setProperty`. */
export function themeToVarMap(theme = {}) {
  const out = {};
  if (!theme || typeof theme !== 'object') return out;
  for (const [key, value] of Object.entries(theme)) {
    const cssVar = THEME_TO_VAR[key];
    if (!cssVar) continue;
    if (value == null || value === '') continue;
    out[cssVar] = String(value);
  }
  return out;
}

// Strip anything that could break out of a CSS value. Theme values are
// usually colour strings or font-stack strings — we whitelist a permissive
// pattern and reject braces / semicolons that would let an attacker inject
// extra rules.
function escapeCssValue(v) {
  const s = String(v);
  if (/[{}<>]/.test(s)) return 'inherit';
  // No newlines either — they don't make sense for these values and would
  // make the emitted style harder to read.
  return s.replace(/[\r\n]/g, ' ');
}

// Per-element style schema — each editable element on the public site is
// tagged with `data-edit-key="<path>"` (e.g. "home.title"). The Site
// Editor stores per-element overrides in `site_copy.data.styles[key]`
// with this shape: { color, fontFamily, fontSize, fontWeight, letterSpacing }
// We only emit rules for keys that have at least one non-empty property.
export const STYLE_PROP_TO_CSS = {
  color:         'color',
  fontFamily:    'font-family',
  fontSize:      'font-size',
  fontWeight:    'font-weight',
  letterSpacing: 'letter-spacing',
};

/** Returns CSS rules (one selector per key) for per-element style
 *  overrides. Each rule targets `[data-edit-key="<key>"]`. */
export function stylesToCssRules(styles = {}) {
  if (!styles || typeof styles !== 'object') return '';
  const rules = [];
  for (const [key, props] of Object.entries(styles)) {
    if (!props || typeof props !== 'object') continue;
    const decls = [];
    for (const [propKey, value] of Object.entries(props)) {
      const cssProp = STYLE_PROP_TO_CSS[propKey];
      if (!cssProp) continue;
      if (value == null || value === '') continue;
      decls.push(`  ${cssProp}: ${escapeCssValue(value)};`);
    }
    if (decls.length === 0) continue;
    // Escape the key for the selector — copy paths only contain
    // [a-zA-Z0-9._] so a simple regex is safe enough.
    const safeKey = String(key).replace(/[^a-zA-Z0-9._-]/g, '');
    if (!safeKey) continue;
    rules.push(`[data-edit-key="${safeKey}"] {\n${decls.join('\n')}\n}`);
  }
  return rules.join('\n\n');
}

/** Combined CSS body for both theme variables and per-element overrides. */
export function buildEditorCss({ theme, styles } = {}) {
  return [themeToCssVars(theme || {}), stylesToCssRules(styles || {})]
    .filter(Boolean)
    .join('\n\n');
}
