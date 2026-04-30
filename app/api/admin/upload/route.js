import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/upload — multipart/form-data with field "file"
 *
 * Storage backend (auto-detected, in priority order):
 *   1. Vercel Blob — when BLOTT_READ_WRITE_TOKEN is set in env
 *      Uses @vercel/blob's put() and returns the public CDN URL.
 *   2. Local disk — fallback for `npm run dev` ONLY.
 *      Writes to public/uploads/<timestamp>-<safe-name>
 *
 * On Vercel the serverless filesystem is read-only, so any disk-write attempt
 * will ENOENT. To prevent surfacing a confusing error to the admin UI we
 * detect the runtime up-front and return a clear, actionable message instead.
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

    // Detect read-only/serverless runtime so we don't try (and fail) to mkdir
    const isServerless =
      process.env.VERCEL === '1' ||
      process.env.VERCEL_ENV ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      (process.env.APP_MODE || '').toLowerCase() === 'production';

    const blobToken = process.env.BLOTT_READ_WRITE_TOKEN;
    const hasBlobToken = !!blobToken;

    // ---------- Backend 1: Vercel Blob ----------
    if (hasBlobToken) {
      try {
        const { put } = await import('@vercel/blob');
        const blob = await put(`uploads/${filename}`, file, {
          access: 'public',
          contentType: file.type || 'application/octet-stream',
          addRandomSuffix: false,
          token: blobToken,
        });
        return NextResponse.json({
          ok: true,
          url: blob.url,
          backend: 'vercel-blob',
          size: file.size,
        });
      } catch (e) {
        if (/Cannot find package/.test(e.message)) {
          return NextResponse.json({
            ok: false,
            error: 'BLOTT_READ_WRITE_TOKEN is set but @vercel/blob is not installed. Run `npm install @vercel/blob` and redeploy.',
            backend: 'vercel-blob',
          }, { status: 500 });
        }
        console.error('[upload] @vercel/blob put failed:', e);
        return NextResponse.json({
          ok: false,
          error: `Vercel Blob upload failed: ${e.message}`,
          backend: 'vercel-blob',
        }, { status: 500 });
      }
    }

    // ---------- Refuse disk fallback in serverless ----------
    if (isServerless) {
      return NextResponse.json({
        ok: false,
        error:
          'File uploads are not configured for this deploy. ' +
          'Connect a Vercel Blob store (Project → Storage → Connect Store → Blob), ' +
          'then redeploy. The BLOTT_READ_WRITE_TOKEN env var must be set with the token from your Public Blob store. ' +
          'Until then, paste a hosted image URL into the field instead.',
        backend: 'none',
        hint: 'BLOTT_READ_WRITE_TOKEN is missing in this environment.',
      }, { status: 503 });
    }

    // ---------- Backend 2: local disk (dev only) ----------
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
    console.error('[upload] unexpected error:', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
