'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import LoadingAnimation from './components/LoadingAnimation';

export default function HomeClient({ copy }) {
  const [loaded, setLoaded] = useState(false);
  const bannerVideoRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('blott_loaded')) {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded && bannerVideoRef.current) {
      bannerVideoRef.current.play().catch(() => {});
    }
  }, [loaded]);

  // copy is the merged object — every field comes from /data/copy.json
  // unless overridden via /admin/copy in the DB.
  const { home, method, about } = copy;
  const steps = Array.isArray(method?.steps) ? method.steps : [];

  return (
    <>
      {!loaded && (
        <LoadingAnimation onComplete={() => {
          sessionStorage.setItem('blott_loaded', '1');
          setLoaded(true);
        }} />
      )}

      <section style={s.banner} aria-label="Blot. animation banner">
        <video
          ref={bannerVideoRef}
          style={s.bannerVideo}
          src="/loading.mp4"
          muted
          loop
          autoPlay
          playsInline
          preload="auto"
          poster="/site-logo.svg"
        />
        <div style={s.bannerOverlay} />
      </section>

      <section id="home" style={{ ...s.section, ...s.homeSection, ...s.white, ...s.bgWrap }}>
        <video
          style={s.bgVideoLeft25}
          src="/blotter.mp4"
          muted
          loop
          autoPlay
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <div className="container" style={{ textAlign: 'center', ...s.contentOver }}>
          <h1 style={s.h1}>
            <em style={s.em}>{home?.title}</em>
          </h1>
          <p style={s.lead}>{home?.lead}</p>
          <div style={s.ctas}>
            <Link href="/quiz" className="btn btn-lg">{home?.ctaPrimary}</Link>
            <Link href="#method" className="btn ghost btn-lg">{home?.ctaSecondary}</Link>
          </div>
        </div>
      </section>

      <section id="method" style={{ ...s.section, ...s.methodSection, ...s.grey, ...s.bgWrap }}>
        <video
          style={s.bgVideoLeft15}
          src="/process.mp4"
          muted
          loop
          autoPlay
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <div className="container" style={s.contentOver}>
          <div style={s.sectionHead}>
            <span className="meta">{method?.eyebrow}</span>
            <h2 style={s.h2}>{method?.title}</h2>
          </div>
          <div style={s.steps}>
            {steps.map((step, i) => (
              <article key={i} style={s.stepCard}>
                <div style={s.stepNum}>{String(i + 1).padStart(2, '0')}</div>
                <h3 style={s.stepTitle}>{step.title}</h3>
                <p style={s.stepBody}>{step.body}</p>
              </article>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 56 }}>
            <Link href="/quiz" className="btn btn-lg">{method?.cta}</Link>
          </div>
        </div>
      </section>

      <section id="about" style={{ ...s.section, ...s.white, ...s.bgWrap }}>
        <video
          style={s.bgVideoLeft75}
          src="/footer.mp4"
          muted
          loop
          autoPlay
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <div className="container-narrow" style={{ textAlign: 'center', ...s.contentOver }}>
          <span className="meta">{about?.eyebrow}</span>
          <h2 style={s.h2}>{about?.title}</h2>
          <p style={s.lead}>{about?.lead}</p>
          <div style={{ marginTop: 28 }}>
            <Link href="/quiz" className="btn btn-lg">{about?.cta}</Link>
          </div>
        </div>
      </section>
    </>
  );
}

const s = {
  banner: {
    position: 'relative',
    width: '100%',
    height: 'clamp(126px, 15vw, 210px)',
    overflow: 'hidden',
    background: 'var(--paper)',
  },
  bannerVideo: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    transform: 'scale(5.5)',
    transformOrigin: 'center center',
    filter: 'contrast(1.45) brightness(1.05) saturate(1.05)',
    mixBlendMode: 'multiply',
    pointerEvents: 'none',
  },
  bannerOverlay: { display: 'none' },

  section: { padding: '110px 0' },
  white:   { background: 'var(--paper)' },
  grey:    { background: 'var(--offwhite)' },

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
  methodSection: { paddingTop: 72, paddingBottom: 110 },
  homeSection:   { paddingTop: 12, paddingBottom: 110 },
  contentOver:   { position: 'relative', zIndex: 1 },

  h1: {
    fontFamily: 'var(--font-serif)', fontSize: 'clamp(44px, 7vw, 88px)',
    fontWeight: 300, letterSpacing: '-.025em', lineHeight: 1.05, marginBottom: 32,
  },
  em: { fontStyle: 'italic', fontWeight: 400 },
  lead: {
    maxWidth: 620, margin: '0 auto',
    fontSize: 16, color: 'var(--grey-2)', lineHeight: 1.7, marginBottom: 36,
  },
  ctas: { display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' },

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
    background: 'var(--paper)', padding: '40px 32px',
    border: '1px solid var(--grey-5)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-soft)',
  },
  stepNum: {
    fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.3em',
    color: 'var(--grey-3)', marginBottom: 24,
  },
  stepTitle: { fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, marginBottom: 12, letterSpacing: '-.01em' },
  stepBody: { fontSize: 14, color: 'var(--grey-2)', lineHeight: 1.7 },
};
