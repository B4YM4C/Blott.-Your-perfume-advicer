/**
 * CSV serialise / parse for the Perfumes library.
 *
 * Why not a library? — keeping this dependency-free so the admin route can
 * deploy without bundle bloat. Spec follows RFC 4180:
 *
 *   - fields are comma-separated
 *   - any field containing a comma, quote or newline is wrapped in `"`
 *   - inner quotes are escaped by doubling them: `He said "hi"` → `"He said ""hi"""`
 *   - rows end with `\r\n` on output; both `\r\n` and `\n` are accepted on input
 *
 * Notes-cell convention: the perfume's `notes` array is flattened to a single
 * cell joined by `;` (semicolon + optional space) so users editing in Excel /
 * Google Sheets don't have to fight CSV quoting. Trim/dedupe on parse.
 *
 * DNA columns: the axis names are taken from /data/params.json (core + meta)
 * at request time, so adding/removing axes through /admin/params updates the
 * CSV header automatically. Missing axes on import default to 0; out-of-range
 * values are clamped to params.clamp (default −10..+10).
 */

const FIXED_HEAD = [
  'id',
  'fragrance',
  'house',
  'family',
  'notes',
  'blurb',
  'image',
  'family_en',
  'notes_en',
  'blurb_en',
];

export function axisNamesFromParams(params) {
  const core = (params?.core || []).map((a) => a.name).filter(Boolean);
  const meta = (params?.meta || []).map((a) => a.name).filter(Boolean);
  // De-dupe in case a name appears in both lists.
  const seen = new Set();
  return [...core, ...meta].filter((n) => (seen.has(n) ? false : (seen.add(n), true)));
}

export function csvHeader(params) {
  return [...FIXED_HEAD, ...axisNamesFromParams(params)];
}

// ---------------------------------------------------------------------
// Serialise
// ---------------------------------------------------------------------

export function serializePerfumesCsv(perfumes, params) {
  const axes = axisNamesFromParams(params);
  const header = [...FIXED_HEAD, ...axes];
  const lines = [header.map(csvEscape).join(',')];
  for (const p of perfumes || []) {
    const row = [
      p.id || '',
      p.fragrance || '',
      p.house || '',
      p.family || '',
      Array.isArray(p.notes) ? p.notes.filter(Boolean).join('; ') : (p.notes || ''),
      p.blurb || '',
      p.image || '',
      p.i18n?.en?.family || '',
      Array.isArray(p.i18n?.en?.notes) ? p.i18n.en.notes.filter(Boolean).join('; ') : '',
      p.i18n?.en?.blurb || '',
      ...axes.map((name) => formatNum(p?.dna?.[name])),
    ];
    lines.push(row.map(csvEscape).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  // Wrap in quotes if any RFC-special char is present, escape inner quotes.
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatNum(n) {
  if (n == null || n === '') return '';
  const x = Number(n);
  return Number.isFinite(x) ? String(x) : '';
}

// ---------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------

/**
 * @returns { rows, errors }
 *   rows:   [{ id, fragrance, house, family, notes:[], blurb, image, dna:{...} }]
 *   errors: [{ line, message }]      – per-row, non-fatal
 */
export function parsePerfumesCsv(text, params) {
  const errors = [];
  const rows = [];
  const stripped = stripBom(text || '');
  if (!stripped.trim()) return { rows, errors };

  const grid = parseCsvGrid(stripped);
  if (grid.length === 0) return { rows, errors };

  const header = grid[0].map((h) => String(h).trim());
  const colIdx = (name) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  if (colIdx('id') < 0 && colIdx('fragrance') < 0) {
    errors.push({ line: 1, message: 'Header must include at least "id" or "fragrance"' });
    return { rows, errors };
  }

  const axes = axisNamesFromParams(params);
  const clampMin = Number(params?.clamp?.min ?? -10);
  const clampMax = Number(params?.clamp?.max ?? 10);

  for (let i = 1; i < grid.length; i++) {
    const r = grid[i];
    // Skip totally empty rows (people leave them in spreadsheets all the time)
    if (!r || r.every((c) => String(c ?? '').trim() === '')) continue;

    const get = (name) => {
      const idx = colIdx(name);
      return idx < 0 ? '' : (r[idx] ?? '');
    };

    const id = String(get('id') || '').trim();
    const fragrance = String(get('fragrance') || '').trim();

    if (!id && !fragrance) {
      errors.push({ line: i + 1, message: 'row has neither id nor fragrance — skipped' });
      continue;
    }

    const dna = {};
    for (const axis of axes) {
      const raw = get(axis);
      const s = String(raw ?? '').trim();
      if (s === '') { dna[axis] = 0; continue; }
      const n = Number(s);
      if (!Number.isFinite(n)) {
        errors.push({ line: i + 1, message: `${axis}: "${s}" is not a number — using 0` });
        dna[axis] = 0;
        continue;
      }
      dna[axis] = Math.max(clampMin, Math.min(clampMax, n));
    }

    const notesCell = String(get('notes') || '').trim();
    const notes = notesCell
      ? notesCell.split(/[;|]/).map((s) => s.trim()).filter(Boolean)
      : [];
    const notesEnCell = String(get('notes_en') || '').trim();
    const notesEn = notesEnCell
      ? notesEnCell.split(/[;|]/).map((s) => s.trim()).filter(Boolean)
      : [];
    const familyEn = String(get('family_en') || '').trim();
    const blurbEn = String(get('blurb_en') || '').trim();

    rows.push({
      id: id || makeIdFrom(fragrance),
      fragrance,
      house:  String(get('house')  || '').trim() || null,
      family: String(get('family') || '').trim() || null,
      notes,
      blurb:  String(get('blurb')  || '').trim() || null,
      image:  String(get('image')  || '').trim() || null,
      dna,
      i18n: (familyEn || notesEn.length || blurbEn)
        ? { en: { family: familyEn || null, notes: notesEn, blurb: blurbEn || null } }
        : {},
    });
  }

  return { rows, errors };
}

function stripBom(s) {
  return s && s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function makeIdFrom(name) {
  const slug = String(name || 'perfume')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  const tail = Math.random().toString(36).slice(2, 6);
  return `p_${slug || 'item'}_${tail}`;
}

/**
 * Streaming character-state parser. Handles quoted fields, escaped `""`,
 * and both `\r\n` / `\n` row terminators. Returns rows of string cells.
 */
function parseCsvGrid(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      cell += ch; i++; continue;
    }

    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(cell); cell = ''; i++; continue; }
    if (ch === '\r') { /* swallow — the \n that follows handles row break */ i++; continue; }
    if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; continue; }

    cell += ch; i++;
  }

  // Flush any trailing cell / row.
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
