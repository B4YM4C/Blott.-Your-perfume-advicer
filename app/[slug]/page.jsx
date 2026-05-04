import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { mergeWithDefaults } from '@/lib/copy';
import { localeFromCookies, localizeCopy } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const RESERVED = new Set(['admin', 'api', 'quiz', 'result']);

export default async function CmsPage({ params }) {
  const slug = String(params?.slug || '').trim().toLowerCase();
  if (!slug || RESERVED.has(slug)) notFound();

  const override = await db.getCopy().catch(() => ({}));
  const locale = localeFromCookies(cookies());
  const copy = localizeCopy(mergeWithDefaults(override), locale);
  const page = (copy.pages || []).find((p) => String(p.slug || '').trim().toLowerCase() === slug);
  if (!page || page.enabled === false || page.enabled === 'false') notFound();

  return (
    <div className="container-narrow" style={s.wrap}>
      {page.eyebrow && <span className="meta" data-edit-key={`pages.${slug}.eyebrow`}>{page.eyebrow}</span>}
      <h1 style={s.title} data-edit-key={`pages.${slug}.title`}>{page.title}</h1>
      {page.body && <p style={s.body} data-edit-key={`pages.${slug}.body`}>{page.body}</p>}
      {page.ctaLabel && page.ctaHref && (
        <Link
          className="btn btn-lg"
          href={page.ctaHref}
          style={{ marginTop: 30 }}
          data-edit-key={`pages.${slug}.ctaLabel`}
          data-puzzle-trigger={`page:${slug}:cta`}
        >
          {page.ctaLabel}
        </Link>
      )}
    </div>
  );
}

const s = {
  wrap: {
    minHeight: '62vh',
    paddingTop: 92,
    paddingBottom: 120,
  },
  title: {
    fontFamily: 'var(--font-serif)',
    fontSize: 'clamp(42px, 8vw, 78px)',
    fontWeight: 300,
    lineHeight: 1,
    marginTop: 18,
  },
  body: {
    marginTop: 24,
    color: 'var(--grey-2)',
    fontSize: 17,
    lineHeight: 1.85,
  },
};
