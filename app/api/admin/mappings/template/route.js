import { NextResponse } from 'next/server';

/**
 * GET /api/admin/mappings/template
 * Returns a sample CSV file admins can download, fill in, and re-upload.
 *
 * Format (header row required, exact column names):
 *   pattern,fragrance,house,family,notes,blurb,image
 *
 *   - pattern   : answer code string e.g. 1B2B3C4D5B  (or `default`)
 *   - notes     : pipe-separated list e.g. Bergamot|Vetiver|Patchouli
 *   - blurb     : free text (commas allowed if quoted)
 *   - image     : optional URL or empty
 */
export const dynamic = 'force-dynamic';

const SAMPLE = [
  ['pattern', 'fragrance', 'house', 'family', 'notes', 'blurb', 'image'],
  ['1B2B3C4D5B', 'Montblanc Explorer', 'Montblanc', 'Woody Aromatic',
   'Bergamot|Vetiver|Patchouli',
   'For the everyday explorer — fresh top, grounded base.',
   ''],
  ['1A2A3A4A5A', 'CK One', 'Calvin Klein', 'Citrus Aromatic',
   'Bergamot|Cardamom|Pineapple|Musk',
   'Light, friendly, easy to wear day or night.',
   ''],
  ['1*2*3D4B5*', 'Tom Ford Tobacco Vanille', 'Tom Ford', 'Oriental Spicy',
   'Tobacco|Vanilla|Cocoa|Tonka',
   'Formal-mysterious — warm, dark, distinctive.',
   ''],
  ['default', 'Maison Margiela Replica — By the Fireplace', 'Maison Margiela', 'Woody Smoky',
   'Pink Pepper|Chestnut|Cashmeran',
   'Our safe match when nothing more specific fits.',
   ''],
];

function toCsv(rows) {
  return rows.map((row) =>
    row.map((cell) => {
      const s = String(cell ?? '');
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    }).join(',')
  ).join('\n') + '\n';
}

export async function GET() {
  const csv = toCsv(SAMPLE);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="blott-mapping-template.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
