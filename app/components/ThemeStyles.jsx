import { themeToCssVars } from '@/lib/theme';

/**
 * Server component that emits a `<style>` tag inside <head> overriding
 * the brand CSS variables based on the saved theme. Renders nothing if
 * the theme is empty / falsy.
 *
 * The override targets `:root` exactly like globals.css so cascade order
 * is "globals.css defaults, then this rule". Place LATE in <head>.
 */
export default function ThemeStyles({ theme }) {
  const css = themeToCssVars(theme || {});
  if (!css) return null;
  return (
    <style id="blot-theme-overrides" dangerouslySetInnerHTML={{ __html: css }} />
  );
}
