import { decodeBottleCode } from '@/lib/bottleArt';

/**
 * BottleArt — renders a parametric line-art bottle silhouette from a
 * 4-character code (see lib/bottleArt.js).
 *
 *   <BottleArt code="2103" size={220} />
 *
 * The output is a single inline <svg> using stroke="currentColor", so it
 * automatically picks up the surrounding text colour. Pure SVG paths,
 * no images, no fonts, no logos — bottle shape only, as requested.
 */
export default function BottleArt({ code = '0000', size = 220, ariaLabel }) {
  const { capIdx, shoulderIdx, bodyIdx, heightIdx } = decodeBottleCode(code);
  const isTall = heightIdx === 1;

  // Vertical layout — viewBox is 100 × 200, body bottom anchored low so
  // short and tall variants share a baseline.
  const baseline = 188;
  const capH    = isTall ? 56 : 46;
  const capTop  = 12;
  const capBottom = capTop + capH;
  const neckH = shoulderIdx === 2 ? 24 : shoulderIdx === 1 ? 8 : 3;
  const neckBottom = capBottom + neckH;
  const bodyTop = neckBottom;
  const bodyH = baseline - bodyTop;
  const bodyW = isTall ? 70 : 76;
  const bodyX = (100 - bodyW) / 2;

  // Cap width depends on style — square caps are narrower, stepped is wider.
  const capW =
    capIdx === 2 ? 30 :
    capIdx === 4 ? 38 :
    capIdx === 3 ? 34 : 32;
  const capX = (100 - capW) / 2;

  return (
    <svg
      width={size}
      height={Math.round(size * (200 / 100))}
      viewBox="0 0 100 200"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel || 'Perfume bottle silhouette'}
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <Cap idx={capIdx}      x={capX}  y={capTop}      w={capW}  h={capH} />
        <Shoulder
          idx={shoulderIdx}
          y={capBottom}
          neckH={neckH}
          capW={capW}
          bodyW={bodyW}
        />
        <Body idx={bodyIdx}    x={bodyX} y={bodyTop}     w={bodyW} h={bodyH} />
      </g>
    </svg>
  );
}

// =================================================================
// Cap renderers
// =================================================================
function Cap({ idx, x, y, w, h }) {
  switch (idx) {
    case 0: // plain cylinder
      return <rect x={x} y={y} width={w} height={h} rx="3" />;
    case 1: // ridged cylinder — like Explorer-style fluting
      return (
        <>
          <rect x={x} y={y} width={w} height={h} rx="3" />
          {ridgeXs(x, w).map((rx) => (
            <line key={rx} x1={rx} y1={y + 5} x2={rx} y2={y + h - 5} />
          ))}
        </>
      );
    case 2: // square block — sharp corners, slightly inset
      return <rect x={x} y={y + 4} width={w} height={h - 4} />;
    case 3: { // domed top
      const r = w / 2;
      const cx = x + r;
      const flatY = y + r * 0.75;
      const d = `M ${x} ${y + h} L ${x} ${flatY} Q ${x} ${y} ${cx} ${y} Q ${x + w} ${y} ${x + w} ${flatY} L ${x + w} ${y + h} Z`;
      return <path d={d} />;
    }
    case 4: { // stepped two-tier cap
      const upperW = w - 10;
      const upperX = x + 5;
      const upperH = h * 0.42;
      const lowerY = y + upperH;
      const lowerH = h - upperH;
      return (
        <>
          <rect x={upperX} y={y} width={upperW} height={upperH} />
          <rect x={x} y={lowerY} width={w} height={lowerH} />
        </>
      );
    }
    default:
      return null;
  }
}

// 4 evenly-spaced vertical ridge x-coords inside a cap of width w.
function ridgeXs(x, w) {
  return [0.22, 0.42, 0.58, 0.78].map((p) => +(x + w * p).toFixed(2));
}

// =================================================================
// Shoulder / neck region — drawn between cap and body.
// =================================================================
function Shoulder({ idx, y, neckH, capW, bodyW }) {
  const cx = 50;
  if (idx === 0) {
    // Flush — cap sits on body with a thin collar line
    const halfBody = bodyW / 2;
    return <line x1={cx - halfBody} y1={y + neckH / 2} x2={cx + halfBody} y2={y + neckH / 2} />;
  }
  if (idx === 1) {
    // Stepped shoulder — a narrow shelf wider than cap, narrower than body
    const shelfW = (capW + bodyW) / 2;
    const shelfX = cx - shelfW / 2;
    return <rect x={shelfX} y={y} width={shelfW} height={neckH} />;
  }
  // idx === 2: long visible neck — narrow rectangle joining cap to body
  const neckW = Math.max(capW * 0.7, 14);
  const neckX = cx - neckW / 2;
  return <rect x={neckX} y={y} width={neckW} height={neckH} />;
}

// =================================================================
// Body renderers
// =================================================================
function Body({ idx, x, y, w, h }) {
  switch (idx) {
    case 0: // cuboid — sharp corners
      return <rect x={x} y={y} width={w} height={h} />;
    case 1: // softly rounded cuboid
      return <rect x={x} y={y} width={w} height={h} rx="6" ry="6" />;
    case 2: { // cylinder — strongly rounded sides
      const r = Math.min(w / 2, 14);
      return <rect x={x} y={y} width={w} height={h} rx={r} ry={r} />;
    }
    case 3: { // tapered — narrows toward base
      const inset = w * 0.1;
      const d = `M ${x} ${y} L ${x + w} ${y} L ${x + w - inset} ${y + h} L ${x + inset} ${y + h} Z`;
      return <path d={d} />;
    }
    case 4: { // capsule — top edges fully rounded, bottom flat
      const r = w / 2;
      const d = `M ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
      return <path d={d} />;
    }
    default:
      return null;
  }
}
