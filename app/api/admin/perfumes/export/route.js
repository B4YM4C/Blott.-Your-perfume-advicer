import { db } from '@/lib/db';
import { serializePerfumesCsv } from '@/lib/perfumeCsv';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/perfumes/export
 *
 * Returns the entire perfume library as a UTF-8 CSV file. The header
 * adapts to whatever DNA axes are currently configured in /admin/params,
 * so adding/removing axes there changes the export columns automatically.
 *
 * Excel + Google Sheets both detect UTF-8 when the BOM is present, so we
 * prepend `\ufeff` to keep Thai blurbs from rendering as mojibake.
 */
export async function GET() {
  const [perfumes, params] = await Promise.all([
    db.listPerfumes(),
    db.getParams(),
  ]);
  const csv = '\ufeff' + serializePerfumesCsv(perfumes, params);
  const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="blott-perfumes-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
