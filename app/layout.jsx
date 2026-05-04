import './globals.css';
import Header from './components/Header';
import Footer from './components/Footer';
import ConsentBanner from './components/ConsentBanner';
import PuzzleEasterEggs from './components/PuzzleEasterEggs';
import ThemeStyles from './components/ThemeStyles';
import PreviewBridge from './components/PreviewBridge';
import { db } from '@/lib/db';
import { mergeWithDefaults } from '@/lib/copy';
import { cookies } from 'next/headers';
import { localeFromCookies, localizeCopy } from '@/lib/i18n';

export const metadata = {
  title: 'Blot. — Your perfume advisor',
  description: 'One dip. One match. Discover your signature fragrance in 7–10 questions.',
  icons: { icon: '/favicon.svg' },
};

// The layout reads `site_copy` once per request so the theme overrides
// always reflect the latest admin save. `force-dynamic` is already set on
// every public page that uses copy; the layout just inherits.
export default async function RootLayout({ children }) {
  const override = await db.getCopy().catch(() => ({}));
  const merged   = mergeWithDefaults(override);
  const locale   = localeFromCookies(cookies());
  const copy     = localizeCopy(merged, locale);
  const theme    = merged?.theme  || {};
  const styles   = merged?.styles || {};

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Italiana&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Theme overrides — emitted late so they win over globals.css */}
        <ThemeStyles theme={theme} styles={styles} />
      </head>
      <body>
        <Header copy={copy} locale={locale} />
        <main>{children}</main>
        <Footer copy={copy} locale={locale} />
        <PuzzleEasterEggs />
        <ConsentBanner copy={copy} />
        {/* Inert unless ?preview=1 is in the URL (used by the visual editor) */}
        <PreviewBridge />
      </body>
    </html>
  );
}
