import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/mappings/upload
 * Body (JSON): { csv: string, mode: 'replace' | 'append' }
 * Parses the CSV with the same header schema as the template
 * and either replaces the entire mapping table or appends to it.
 */
export async function POST(req) {
  try {
    const { csv, mode = 'append' } = await req.json();
    if (typeof csv !== 'string' || !csv.trim()) {
      return NextResponse.json({ ok: false, error: 'CSV body is empty.' }, { status: 400 });
    }

    const rows = parseCsv(csv);
    if (rows.length < 2) {
      return NextResponse.json({ ok: false, error: 'CSV needs a header row + at least one data row.' }, { status: 400 });
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const required = ['pattern', 'fragrance'];
    for (const r of required) {
      if (!header.includes(r)) {
        return NextResponse.json(
          { ok: false, error: `Missing required column: "${r}"` }, { status: 400 }
        );
      }
    }
    const idx = (name) => header.indexOf(name);

    const items = [];
    const errors = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (r.length === 1 && r[0] === '') continue; // blank line
      const pattern = (r[idx('pattern')] || '').trim();
      const fragrance = (r[idx('fragrance')] || '').trim();
      if (!pattern || !fragrance) {
        errors.push(`Row ${i + 1}: pattern and fragrance are required`);
        continue;
      }
      const notesField = idx('notes') >= 0 ? (r[idx('notes')] || '') : '';
      items.push({
        pattern,
        fragrance,
        house:   idx('house')  >= 0 ? (r[idx('house')]  || '').trim() : '',
        family:  idx('family') >= 0 ? (r[idx('family')] || '').trim() : '',
        notes: notesField
          .split(/[|;]/)
          .map((s) => s.trim())
          .filter(Boolean),
        blurb:   idx('blurb') >= 0 ? (r[idx('blurb')] || '').trim() : '',
        image:   idx('image') >= 0 ? (r[idx('image')] || '').trim() || null : null,
      });
    }

    if (items.length === 0) {
      return NextResponse.json({ ok: false, error: 'No valid rows.', details: errors }, { status: 400 });
    }

    if (mode === 'replace') {
      if (typeof db.replaceMappings === 'function') {
        await db.replaceMappings(items);
      } else {
        const current = await db.listMappings();
        while (current.length) { await db.deleteMapping?.(0); current.pop(); }
        for (const m of items) await db.upsertMapping(m);
      }
    } else {
      for (const m of items) await db.upsertMapping(m);
    }

    return NextResponse.json({
      ok: true,
      inserted: items.length,
      skipped: errors.length,
      errors,
      mode,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

/**
 * Minimal CSV parser — handles quoted fields with embedded commas / newlines / "" escaping.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  // Normalise line endings
  const src = text.replace(/\r\n?/g, '\n');

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else {
        cell += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
  }
  // Final cell
  row.push(cell);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}
