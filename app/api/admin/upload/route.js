import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/upload — multipart/form-data with field "file"
 *
 * Storage backend (auto-detected, in priority order):
 *   1. Vercel Blob — when BLOB_READ_WRITE_TOKEN is set in env
 *      Returns the public CDN URL from @vercel/blob.
 *   2. Local disk — fallback for `npm run dev`
 *      Writes to public/uploads/<timestamp>-<safe-name>
 *      Returns /uploads/<filename>
 *
 * Vercel's serverless filesystem is read-only, so disk writes only work
 * locally. Configure Vercel Blob in the project's Storage tab and Vercel
 * will inject BLOB_READ_WRITE_TOKEN automatically at build + runtime.
 */
export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ ok: false, error: 'No file' }, { status: 400 });
    }

    const safe = (file.name || 'upload').replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(-80);
    const ts = Date.now();
    const filename = `${ts}-${safe}`;

    // ---------- Backend 1: Vercel Blob ----------
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import('@vercel/blob');
        const blob = await put(`uploads/${filename}`, file, {
          access: 'public',
          contentType: file.type || 'application/octet-stream',
          // addRandomSuffix off — we already have a timestamp prefix
          addRandomSuffix: false,
        });
        return NextResponse.json({
          ok: true,
          url: blob.url,
          backend: 'vercel-blob',
          size: file.size,
        });
      } catch (e) {
        // If the @vercel/blob package isn't installed, surface a useful error
        if (/Cannot find package/.test(e.message)) {
          return NextResponse.json({
            ok: false,
            error: 'BLOB_READ_WRITE_TOKEN is set but @vercel/blob is not installed. Run `npm install @vercel/blob`.',
          }, { status: 500 });
        }
        throw e;
      }
    }

    // ---------- Backend 2: local disk ----------
    const buf = Buffer.from(await file.arrayBuffer());
    const dir = path.join(process.cwd(), 'public', 'uploads');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), buf);

    return NextResponse.json({
      ok: true,
      url: `/uploads/${filename}`,
      backend: 'disk',
      size: buf.length,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
