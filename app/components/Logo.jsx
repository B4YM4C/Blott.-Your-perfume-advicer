/**
 * Logo — official site logo (uploaded by client)
 * Source: /public/site-logo.svg
 *
 * Usage:
 *   <Logo width={140} />              // default — natural ink colour
 *   <Logo width={120} invert />       // for dark backgrounds (CSS filter)
 *   <Logo width={200} variant="full" />  // alias — same logo, kept for API compat
 */
export default function Logo({ width = 140, invert = false, alt = 'Blot. — Your perfume advisor' }) {
  // Source SVG viewBox: 491.121 288.925 237.024 163.037 → aspect ≈ 1.454
  const height = Math.round((width * 163.037) / 237.024);
  const style = invert
    ? { filter: 'invert(1) hue-rotate(180deg)' }
    : undefined;

  return (
    <img
      src="/site-logo.svg"
      width={width}
      height={height}
      alt={alt}
      style={{ display: 'block', ...style }}
      draggable="false"
    />
  );
}
