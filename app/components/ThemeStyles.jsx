import { buildEditorCss } from '@/lib/theme';

/**
 * Server component that emits a `<style>` tag inside <head> overriding
 * the brand CSS variables (theme) AND any per-element style overrides
 * (styles[edit-key]). Renders nothing if both are empty.
 *
 * The override targets `:root` and `[data-edit-key="..."]` — placed late
 * in <head> so it wins over globals.css and inline component styles.
 */
export default function ThemeStyles({ theme, styles }) {
  const css = buildEditorCss({ theme: theme || {}, styles: styles || {} });
  if (!css) return null;
  return (
    <style id="blot-theme-overrides" dangerouslySetInnerHTML={{ __html: css }} />
  );
}
