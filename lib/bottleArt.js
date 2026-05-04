/**
 * Bottle line-art encoding.
 *
 * Each perfume gets a 4-character `artCode` string (4 ASCII bytes / row)
 * that picks one cell out of a 5 × 3 × 5 × 2 = 150-combination grid:
 *
 *   index 0  CAP        c0 cylinder · c1 ridged · c2 square · c3 domed · c4 stepped
 *   index 1  SHOULDER   s0 flush    · s1 step   · s2 long-neck
 *   index 2  BODY       b0 cuboid   · b1 round  · b2 cylinder · b3 tapered · b4 capsule
 *   index 3  HEIGHT     h0 short    · h1 tall
 *
 * Storage cost: 4 bytes per perfume × 200 perfumes = 800 bytes total.
 * Render cost: zero — the SVG is computed inline by <BottleArt code="…" />.
 *
 * Why this shape grid and not a hash? Because we want a meaningful map
 * from perfume character (house / family) → silhouette, so two warm
 * orientals don't end up looking like a citrus and a leather. The
 * heuristic in `suggestArtCode` does that biasing; the remaining
 * variation is filled in by a deterministic id hash so every perfume in
 * the same family still looks distinct.
 */

export const CAP_OPTIONS      = ['cylinder', 'ridged', 'square', 'domed', 'stepped'];
export const SHOULDER_OPTIONS = ['flush', 'step', 'longneck'];
export const BODY_OPTIONS     = ['cuboid', 'round', 'cylinder', 'tapered', 'capsule'];
export const HEIGHT_OPTIONS   = ['short', 'tall'];

export const CAP_LABELS = {
  cylinder: 'Cylinder',
  ridged:   'Ridged cylinder',
  square:   'Square block',
  domed:    'Domed',
  stepped:  'Stepped tier',
};
export const BODY_LABELS = {
  cuboid:   'Rectangular',
  round:    'Rounded',
  cylinder: 'Cylinder',
  tapered:  'Tapered',
  capsule:  'Capsule',
};
export const SHOULDER_LABELS = {
  flush:    'Flush collar',
  step:     'Stepped shoulder',
  longneck: 'Long neck',
};
export const HEIGHT_LABELS = { short: 'Short', tall: 'Tall' };

/** Decode a 4-character code into named parts. Falls back to defaults. */
export function decodeBottleCode(code) {
  const s = String(code || '').padEnd(4, '0');
  const c = clamp(parseInt(s[0], 10), 0, CAP_OPTIONS.length - 1);
  const sh = clamp(parseInt(s[1], 10), 0, SHOULDER_OPTIONS.length - 1);
  const b = clamp(parseInt(s[2], 10), 0, BODY_OPTIONS.length - 1);
  const h = clamp(parseInt(s[3], 10), 0, HEIGHT_OPTIONS.length - 1);
  return {
    cap: CAP_OPTIONS[c],         capIdx: c,
    shoulder: SHOULDER_OPTIONS[sh], shoulderIdx: sh,
    body: BODY_OPTIONS[b],       bodyIdx: b,
    height: HEIGHT_OPTIONS[h],   heightIdx: h,
  };
}

export function encodeBottleCode({ capIdx = 0, shoulderIdx = 0, bodyIdx = 0, heightIdx = 0 } = {}) {
  return `${capIdx}${shoulderIdx}${bodyIdx}${heightIdx}`;
}

function clamp(n, lo, hi) {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Deterministic suggestion: pick a code from house + family hints, then
 * fill the remaining axes from a stable hash of the perfume id so two
 * perfumes from the same house still differ.
 */
export function suggestArtCode(perfume) {
  if (!perfume) return '0000';
  const id = String(perfume.id || perfume.fragrance || '');
  const h = hashString(id);

  const house = (perfume.house || '').toLowerCase();
  const family = (perfume.family || '').toLowerCase();

  // Cap axis — biased by house "feel"
  let capIdx;
  if (/tom ford|amouage|xerjoff/.test(house))           capIdx = 2; // square block
  else if (/chanel|guerlain|dior/.test(house))           capIdx = 3; // domed
  else if (/le labo|byredo|diptyque|frederic malle/.test(house)) capIdx = 0; // plain cylinder
  else if (/maison francis|parfums de marly|creed/.test(house))  capIdx = 4; // stepped
  else if (/ysl|yves saint laurent|prada|gucci/.test(house))     capIdx = 1; // ridged
  else capIdx = h % 5;

  // Body axis — biased by family
  let bodyIdx;
  if (/woody|aromatic|fougère|fougere|leather/.test(family)) bodyIdx = 0; // cuboid
  else if (/floral|citrus|aquatic|fresh|aldehyd/.test(family)) bodyIdx = 2; // cylinder
  else if (/amber|oriental|gourmand|sweet/.test(family))       bodyIdx = 4; // capsule
  else if (/spicy|smoky|tobacco/.test(family))                 bodyIdx = 3; // tapered
  else if (/chypre|musk|powdery/.test(family))                 bodyIdx = 1; // round
  else bodyIdx = (h >> 3) % 5;

  // Shoulder + height — pure id hash (still deterministic)
  const shoulderIdx = (h >> 6) % 3;
  const heightIdx   = (h >> 8) % 2;

  return encodeBottleCode({ capIdx, shoulderIdx, bodyIdx, heightIdx });
}

/** djb2 — small deterministic int hash. */
function hashString(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Enumerate every (150) code in canonical order — used by the picker. */
export function allBottleCodes() {
  const out = [];
  for (let c = 0; c < CAP_OPTIONS.length; c++)
    for (let s = 0; s < SHOULDER_OPTIONS.length; s++)
      for (let b = 0; b < BODY_OPTIONS.length; b++)
        for (let h = 0; h < HEIGHT_OPTIONS.length; h++)
          out.push(`${c}${s}${b}${h}`);
  return out;
}
