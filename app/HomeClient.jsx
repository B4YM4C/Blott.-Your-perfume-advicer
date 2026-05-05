'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import LoadingAnimation from './components/LoadingAnimation';

export default function HomeClient({ copy }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('blott_loaded')) {
      setLoaded(true);
    }
  }, []);

  // copy is the merged object — every field comes from /data/copy.json
  // unless overridden via /admin/copy in the DB.
  const { home, method, about } = copy;
  const steps = Array.isArray(method?.steps) ? method.steps : [];
  const extraSections = Array.isArray(home?.sections)
    ? home.sections
      .map((section, index) => ({ ...(section || {}), __index: index }))
      .filter((section) => section && section.enabled !== false && section.enabled !== 'false')
    : [];

  return (
    <>
      {!loaded && (
        <LoadingAnimation onComplete={() => {
          sessionStorage.setItem('blott_loaded', '1');
          setLoaded(true);
        }} />
      )}

      <section id="home" className="home-section home-section-hero phase2-scene" style={{ ...s.section, ...s.homeSection, ...s.bgWrap }}>
        <div className="phase2-hero-art" aria-hidden="true">
          <span className="phase2-pipette" />
          <span className="phase2-perfume-dust" />
          <span className="phase2-drop phase2-drop-main" />
          <span className="phase2-drop phase2-drop-small" />
          <span className="phase2-blotter-card"><span>Blott.</span></span>
          <span className="phase2-soft-fold phase2-soft-fold-right" />
          <span className="phase2-soft-fold phase2-soft-fold-bottom" />
        </div>
        <div className="container home-content-over home-hero-centered" style={{ ...s.contentOver }}>
          <h1 className="home-h1" style={s.h1}>
            <em style={s.em} data-edit-key="home.title">{home?.title}</em>
          </h1>
          <p className="home-lead" style={s.lead} data-edit-key="home.lead">{home?.lead}</p>
          <div className="home-ctas" style={s.ctas}>
            <Link href="/quiz" className="btn btn-lg" data-edit-key="home.ctaPrimary" data-puzzle-trigger="home.ctaPrimary">{home?.ctaPrimary}</Link>
            <Link href="#method" className="btn ghost btn-lg" data-edit-key="home.ctaSecondary" data-puzzle-trigger="home.ctaSecondary">{home?.ctaSecondary}</Link>
          </div>

          <blockquote className="home-signature-quote" style={s.quote}>
            <span aria-hidden="true" style={s.quoteMark}>“</span>
            <span>Your scent is your signature.</span>
            <small>We help you find it.</small>
          </blockquote>
        </div>
      </section>

      <section id="method" className="home-section home-section-method phase2-scene" style={{ ...s.section, ...s.methodSection, ...s.bgWrap }}>
        <div className="phase2-section-art phase2-method-art" aria-hidden="true">
          <span className="phase2-method-blotter" />
          <span className="phase2-method-drop" />
          <span className="phase2-method-fold" />
          <span className="phase2-method-dust" />
        </div>
        <div className="container home-content-over" style={s.contentOver}>
          <div className="home-section-head" style={s.sectionHead}>
            <span className="meta" data-edit-key="method.eyebrow">{method?.eyebrow}</span>
            <h2 className="home-h2" style={s.h2} data-edit-key="method.title">{method?.title}</h2>
          </div>
          <div className="home-steps" style={s.steps}>
            {steps.map((step, i) => (
              <article
                key={i}
                className="home-step-card"
                style={s.stepCard}
                data-edit-key="home.method.stepCard"
                data-structure-list="method.steps"
                data-structure-index={i}
                data-structure-kind="card"
              >
                <div style={s.stepNum} data-edit-key="home.method.stepNum">{String(i + 1).padStart(2, '0')}</div>
                <h3 style={s.stepTitle} data-edit-key={`method.steps.${i}.title`}>{step.title}</h3>
                <p style={s.stepBody} data-edit-key={`method.steps.${i}.body`}>{step.body}</p>
              </article>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 56 }}>
            <Link href="/quiz" className="btn btn-lg" data-edit-key="method.cta" data-puzzle-trigger="method.cta">{method?.cta}</Link>
          </div>
        </div>
      </section>

      <section id="about" className="home-section home-section-about phase2-scene" style={{ ...s.section, ...s.bgWrap }}>
        <div className="phase2-section-art phase2-about-art" aria-hidden="true">
          <span className="phase2-about-pipette" />
          <span className="phase2-about-drop" />
          <span className="phase2-about-fold-left" />
          <span className="phase2-about-fold-right" />
          <span className="phase2-about-dust" />
        </div>
        <div className="container-narrow home-content-over" style={{ textAlign: 'center', ...s.contentOver }}>
          <span className="meta" data-edit-key="about.eyebrow">{about?.eyebrow}</span>
          <h2 className="home-h2" style={s.h2} data-edit-key="about.title">{about?.title}</h2>
          <p className="home-lead" style={s.lead} data-edit-key="about.lead">{about?.lead}</p>
          <div style={{ marginTop: 28 }}>
            <Link href="/quiz" className="btn btn-lg" data-edit-key="about.cta" data-puzzle-trigger="about.cta">{about?.cta}</Link>
          </div>
        </div>
      </section>

      {extraSections.length > 0 && (
        <section id="content" className="home-section home-section-content phase2-scene" style={{ ...s.section, ...s.bgWrap }}>
          <div className="phase2-section-art phase2-content-art" aria-hidden="true">
            <span className="phase2-content-blotter" />
            <span className="phase2-content-drop" />
            <span className="phase2-content-fold" />
          </div>
          <div className="container home-content-over" style={s.contentGrid}>
            {extraSections.map((section, i) => (
              <DynamicContentBox
                key={`${section.id || 'section'}-${section.__index}`}
                section={section}
                index={section.__index}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function DynamicContentBox({ section, index }) {
  const variant = section.variant || 'editorial-card';
  const variantStyle = contentVariantStyles[variant] || contentVariantStyles['editorial-card'];
  const isDark = variant === 'dark-cta' || variant === 'campaign-strip';

  return (
    <article
      style={{ ...s.contentBox, ...variantStyle.card }}
      data-edit-key={`home.sections.${index}.card`}
      data-structure-list="home.sections"
      data-structure-index={index}
      data-structure-id={section.id || index}
      data-structure-kind="content-box"
    >
      {section.mediaUrl && (
        <img
          src={section.mediaUrl}
          alt=""
          style={{ ...s.contentMedia, ...variantStyle.media }}
          data-edit-key={`home.sections.${index}.mediaUrl`}
        />
      )}
      {section.eyebrow && (
        <span className="meta" style={variantStyle.eyebrow} data-edit-key={`home.sections.${index}.eyebrow`}>
          {section.eyebrow}
        </span>
      )}
      <h2 style={{ ...s.contentTitle, ...variantStyle.title }} data-edit-key={`home.sections.${index}.title`}>
        {section.title}
      </h2>
      {section.body && (
        <p style={{ ...s.contentBody, ...variantStyle.body }} data-edit-key={`home.sections.${index}.body`}>
          {section.body}
        </p>
      )}
      {section.ctaLabel && (
        <Link
          href={section.ctaHref || '/quiz'}
          className={isDark ? 'btn inverted' : 'btn'}
          style={{ marginTop: 24, ...variantStyle.cta }}
          data-edit-key={`home.sections.${index}.ctaLabel`}
          data-puzzle-trigger={`home.sections.${index}.cta`}
        >
          {section.ctaLabel}
        </Link>
      )}
    </article>
  );
}

const contentVariantStyles = {
  'editorial-card': {
    card: {},
  },
  'feature-banner': {
    card: {
      gridColumn: '1 / -1',
      minHeight: 260,
      display: 'grid',
      alignContent: 'center',
      padding: '56px clamp(28px, 6vw, 72px)',
    },
    title: { maxWidth: 720, fontSize: 'clamp(38px, 6vw, 72px)' },
    body: { maxWidth: 620 },
  },
  'quiet-note': {
    card: { background: 'transparent', boxShadow: 'none', borderStyle: 'dashed' },
    title: { fontSize: 30 },
  },
  'dark-cta': {
    card: { background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)', gridColumn: '1 / -1' },
    eyebrow: { color: 'var(--grey-4)' },
    body: { color: 'var(--grey-4)', maxWidth: 620 },
  },
  'quote-panel': {
    card: { textAlign: 'center', padding: '48px 32px' },
    title: { fontStyle: 'italic', fontSize: 44 },
    body: { marginLeft: 'auto', marginRight: 'auto', maxWidth: 520 },
  },
  'compact-card': {
    card: { padding: 26 },
    title: { fontSize: 28 },
    body: { fontSize: 13 },
  },
  'split-copy': {
    card: {
      gridColumn: '1 / -1',
      display: 'grid',
      gridTemplateColumns: 'minmax(180px, .7fr) minmax(260px, 1.3fr)',
      gap: 28,
      alignItems: 'center',
    },
    title: { marginTop: 0 },
  },
  'metric-card': {
    card: { borderTop: '4px solid var(--ink)' },
    title: { fontFamily: 'var(--font-mono)', fontSize: 42, letterSpacing: '.08em', textTransform: 'uppercase' },
  },
  'soft-panel': {
    card: { background: 'linear-gradient(180deg, var(--paper), var(--offwhite))' },
  },
  'campaign-strip': {
    card: {
      gridColumn: '1 / -1',
      background: 'var(--ink)',
      color: 'var(--paper)',
      borderColor: 'var(--ink)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 24,
      flexWrap: 'wrap',
    },
    title: { marginTop: 0, fontSize: 34 },
    body: { color: 'var(--grey-4)', maxWidth: 520 },
    cta: { marginTop: 0 },
  },
};

const s = {
  section: { padding: '110px 0' },
  /* Ivory satin section */
  white: { background: 'linear-gradient(180deg, var(--paper), #F5EEE2)' },
  /* Cashmere linen section */
  grey:  {
    background:
      'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(100,78,52,.007) 2px, rgba(100,78,52,.007) 2.4px),' +
      'linear-gradient(180deg, var(--offwhite), #EAE0CE)',
  },

  bgWrap: { position: 'relative', overflow: 'hidden', isolation: 'isolate' },
  bgVideoLeft25: {
    position: 'absolute', top: '50%', left: '20%',
    transform: 'translate(-50%, -50%)',
    width: 'min(720px, 60%)', height: 'auto',
    objectFit: 'contain', opacity: 0.85,
    filter: 'contrast(1.35) brightness(1.05) saturate(1)',
    mixBlendMode: 'multiply', pointerEvents: 'none', zIndex: 0,
  },
  bgVideoLeft15: {
    position: 'absolute', bottom: 0, left: '15%',
    transform: 'translateX(-50%)',
    width: 'min(640px, 50%)', height: 'auto',
    objectFit: 'contain', opacity: 0.85,
    filter: 'contrast(1.4) brightness(1.05) saturate(1)',
    mixBlendMode: 'multiply', pointerEvents: 'none', zIndex: 0,
  },
  bgVideoLeft75: {
    position: 'absolute', bottom: 0, left: '75%',
    transform: 'translateX(-50%)',
    width: 'min(640px, 50%)', height: 'auto',
    objectFit: 'contain', opacity: 0.85,
    filter: 'contrast(1.4) brightness(1.05) saturate(1)',
    mixBlendMode: 'multiply', pointerEvents: 'none', zIndex: 0,
  },
  methodSection: { paddingTop: 84, paddingBottom: 112 },
  homeSection:   { minHeight: 'calc(100vh - 104px)', paddingTop: 'clamp(86px, 12vh, 140px)', paddingBottom: 82 },
  contentOver:   { position: 'relative', zIndex: 1 },

  h1: {
    fontFamily: 'var(--font-serif)', fontSize: 'clamp(44px, 7vw, 88px)',
    maxWidth: 720,
    margin: '0 auto 24px',
    fontWeight: 300, letterSpacing: 0, lineHeight: .98,
    textAlign: 'center',
  },
  em: { fontStyle: 'italic', fontWeight: 400 },
  lead: {
    maxWidth: 460,
    margin: '0 auto 36px',
    fontSize: 16, color: 'var(--grey-3)', lineHeight: 1.78,
    textAlign: 'center',
  },
  ctas: { display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' },
  featurePanel: {
    marginTop: 'clamp(92px, 18vh, 170px)',
    width: 'min(660px, 100%)',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 0,
  },
  featureItem: {
    minHeight: 148,
    padding: '28px 26px',
    textAlign: 'center',
  },
  featureTitle: {
    marginTop: 14,
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '.02em',
  },
  featureBody: {
    margin: '8px auto 0',
    maxWidth: 140,
    color: 'var(--grey-2)',
    fontSize: 12,
    lineHeight: 1.65,
  },
  quote: {
    margin: 'clamp(64px, 10vh, 120px) auto 0',
    color: 'var(--ink)',
    fontFamily: 'var(--font-serif)',
    fontSize: 24,
    lineHeight: 1.4,
    textAlign: 'center',
    maxWidth: 520,
  },
  quoteMark: { marginRight: 8, fontSize: 26 },

  sectionHead: { textAlign: 'center', marginBottom: 64 },
  h2: {
    fontFamily: 'var(--font-serif)', fontSize: 'clamp(34px, 5vw, 52px)',
    fontWeight: 400, letterSpacing: '-.015em', marginTop: 14, lineHeight: 1.15,
  },
  steps: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 18,
  },
  stepCard: {
    background: 'linear-gradient(148deg, rgba(252,248,242,.84), rgba(238,226,210,.7))',
    padding: '40px 32px',
    border: '1px solid rgba(255,252,246,.84)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-raised), var(--shadow-inset)',
    backdropFilter: 'blur(18px)',
  },
  stepNum: {
    fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.3em',
    color: 'var(--grey-3)', marginBottom: 24,
  },
  stepTitle: { fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, marginBottom: 12, letterSpacing: '-.01em' },
  stepBody: { fontSize: 14, color: 'var(--grey-2)', lineHeight: 1.7 },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 18,
  },
  contentBox: {
    background: 'linear-gradient(148deg, rgba(252,248,242,.84), rgba(238,226,210,.7))',
    border: '1px solid rgba(255,252,246,.84)',
    borderRadius: 'var(--radius-lg)',
    padding: 36,
    boxShadow: 'var(--shadow-raised), var(--shadow-inset)',
    backdropFilter: 'blur(18px)',
  },
  contentMedia: {
    width: '100%',
    maxHeight: 280,
    objectFit: 'cover',
    border: '1px solid var(--grey-5)',
    borderRadius: 'var(--radius-sm)',
    marginBottom: 22,
  },
  contentTitle: {
    fontFamily: 'var(--font-serif)',
    fontSize: 36,
    fontWeight: 400,
    lineHeight: 1.12,
    marginTop: 14,
  },
  contentBody: {
    color: 'var(--grey-2)',
    fontSize: 14,
    lineHeight: 1.75,
    marginTop: 14,
  },
};
