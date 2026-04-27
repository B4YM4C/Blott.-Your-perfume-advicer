import { NextResponse } from 'next/server';

/**
 * HTTP Basic auth in front of /admin and /api/admin.
 *
 * Configure in env:
 *   ADMIN_USER=...   (defaults to 'admin' if unset, only when ADMIN_PASS is also unset)
 *   ADMIN_PASS=...   REQUIRED in production. If unset in prod, the middleware
 *                    DENIES all admin access (locked-by-default).
 *
 * Skipped entirely in `next dev` unless ADMIN_PASS is explicitly set, so local
 * development isn't gated by a credential prompt.
 */
export function middleware(req) {
  const { pathname } = req.nextUrl;
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  if (!isAdminPath) return NextResponse.next();

  const isProd = process.env.NODE_ENV === 'production';
  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASS;

  // Local dev with no creds set → wide open
  if (!isProd && !pass) return NextResponse.next();

  // Production with no password → fail closed
  if (isProd && !pass) {
    return new NextResponse('Admin disabled — set ADMIN_PASS in env to enable.', {
      status: 503,
      headers: { 'content-type': 'text/plain' },
    });
  }

  const header = req.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) return unauthorized();

  let decoded = '';
  try {
    decoded = atob(header.slice(6).trim());
  } catch {
    return unauthorized();
  }
  const idx = decoded.indexOf(':');
  if (idx < 0) return unauthorized();
  const u = decoded.slice(0, idx);
  const p = decoded.slice(idx + 1);

  if (timingSafeEqual(u, user) && timingSafeEqual(p, pass)) {
    return NextResponse.next();
  }
  return unauthorized();
}

function unauthorized() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Blot. Admin", charset="UTF-8"',
      'content-type': 'text/plain',
    },
  });
}

// Constant-time comparison to prevent trivial timing attacks
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
