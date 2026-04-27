'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import LoadingAnimation from './components/LoadingAnimation';

export default function HomePage() {
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

  return (
    <>
      {!loaded && (
        <LoadingAnimation onComplete={() => {
          sessionStorage.setItem('blott_loaded', '1');
          setLoaded(true);
        }} />
      )}

      {/* ============== BANNER (between header & content) ==============
           .mov plays as a zoomed-in 300% animation background.
           No padding, no border — full bleed banner, fixed aspect ratio. */}
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

      {/* ============== HOME — white, with Blotter bg video at 20% from left ============== */}
      <section id="home" style={{ ...s.section, ...s.homeSection, ...s.white, ...s.bgWrap }}>
        {/* Background video — anchored 20% from left, blends with white via multiply */}
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
            <em style={s.em}>Found in a few dips.</em>
          </h1>
          <p style={s.lead}>
            ตอบคำถาม 5–10 ข้อ แล้วให้เราช่วยเลือกน้ำหอมที่ใช่สำหรับคุณ —
            ไม่ต้องสมัคร ไม่ต้องล็อกอิน แค่จุ่มกระดาษทดสอบกับเรา
          </p>
          <div style={s.ctas}>
            <Link href="/quiz" className="btn btn-lg">Begin the dip →</Link>
            <Link href="#method" className="btn ghost btn-lg">How it works</Link>
          </div>
        </div>
      </section>

      {/* ============== START QUIZ / METHOD — grey, with process bg video at 15% from left ============== */}
      <section id="method" style={{ ...s.section, ...s.methodSection, ...s.grey, ...s.bgWrap }}>
        {/* Background video — anchored 15% from left, blends with grey via multiply */}
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
            <span className="meta">Method · 01</span>
            <h2 style={s.h2}>Three steps. One match.</h2>
          </div>
          <div style={s.steps}>
            {STEPS.map((step, i) => (
              <article key={i} style={s.stepCard}>
                <div style={s.stepNum}>0{i + 1}</div>
                <h3 style={s.stepTitle}>{step.title}</h3>
                <p style={s.stepBody}>{step.body}</p>
              </article>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 56 }}>
            <Link href="/quiz" className="btn btn-lg">Start the quiz →</Link>
          </div>
        </div>
      </section>

      {/* ============== ABOUT — white, plain ============== */}
      <section id="about" style={{ ...s.section, ...s.white, ...s.bgWrap }}>
        {/* Background video — anchored 75% from left, bottom flush with section bottom */}
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
          <span className="meta">About · 02</span>
          <h2 style={s.h2}>
            A blotter is where every <em style={s.em}>scent story</em> begins.
          </h2>
          <p style={s.lead}>
            Blot. คือกระดาษทดลองน้ำหอมที่กลายเป็น quiz — เราเชื่อว่าทุกคนมีกลิ่นที่ใช่
            แค่ต้องมีคนช่วยกรองให้เหลือคำตอบเดียว
          </p>
          <div style={{ marginTop: 28 }}>
            <Link href="/quiz" className="btn btn-lg">Find my match →</Link>
          </div>
        </div>
      </section>
    </>
  );
}

const STEPS = [
  { title: 'Tell us about you', body: 'งบประมาณ ช่วงอายุ สไตล์การแต่งตัว สถานที่ที่คุณชอบ — เริ่มจากเรื่องง่ายๆ' },
  { title: 'We dip the strips', body: 'ระบบจะกรองกลิ่นกว่า 200 ตัวเลือก ผ่าน logic ที่ออกแบบโดยทีมน้ำหอมจริง' },
  { title: 'Meet your match', body: 'ได้รับน้ำหอมที่ตรงใจที่สุดพร้อมเหตุผล — ส่งให้ทาง email หรือดูบนหน้าเว็บก็ได้' },
];

const s = {
  // ---------- Banner ----------
  banner: {
    position: 'relative',
    width: '100%',
    // Shrunk to ~70% so it matches the previously-displayed (0.7-scaled) content height
    height: 'clamp(126px, 15vw, 210px)',
    overflow: 'hidden',
    background: 'var(--paper)',
  },
  bannerVideo: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    // 'contain' so nothing at the top/bottom of the video gets cropped
    objectFit: 'contain',
    // scale 5.5
    transform: 'scale(5.5)',
    transformOrigin: 'center center',
    filter: 'contrast(1.45) brightness(1.05) saturate(1.05)',
    mixBlendMode: 'multiply',
    pointerEvents: 'none',
  },
  bannerOverlay: { display: 'none' },

  // ---------- Section base ----------
  section: { padding: '110px 0' },
  white:   { background: 'var(--paper)' },
  grey:    { background: 'var(--offwhite)' },

  // ---------- Background-video sections ----------
  bgWrap: {
    position: 'relative',
    overflow: 'hidden',
    isolation: 'isolate',                 // contain blend modes
  },
  // HOME (blotter.mp4) — anchored 20% from the LEFT edge (5% further left than before)
  bgVideoLeft25: {
    position: 'absolute',
    top: '50%',
    left: '20%',
    transform: 'translate(-50%, -50%)',
    width: 'min(720px, 60%)',
    height: 'auto',
    objectFit: 'contain',
    opacity: 0.85,
    filter: 'contrast(1.35) brightness(1.05) saturate(1)',
    mixBlendMode: 'multiply',
    pointerEvents: 'none',
    zIndex: 0,
  },
  // METHOD (process.mp4) — anchored 15% from the LEFT edge,
  // and the BOTTOM of the video sits exactly on the section's bottom edge.
  // (height:auto + explicit width preserves native aspect, so no letterbox in the box → bottom of box = bottom of video content.)
  bgVideoLeft15: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    transform: 'translateX(-50%)',
    width: 'min(640px, 50%)',
    height: 'auto',
    objectFit: 'contain',
    opacity: 0.85,
    filter: 'contrast(1.4) brightness(1.05) saturate(1)',
    mixBlendMode: 'multiply',
    pointerEvents: 'none',
    zIndex: 0,
  },
  // ABOUT (footer.mp4) — anchored 75% from the LEFT edge, bottom flush with section bottom
  bgVideoLeft75: {
    position: 'absolute',
    bottom: 0,
    left: '75%',
    transform: 'translateX(-50%)',
    width: 'min(640px, 50%)',
    height: 'auto',
    objectFit: 'contain',
    opacity: 0.85,
    filter: 'contrast(1.4) brightness(1.05) saturate(1)',
    mixBlendMode: 'multiply',
    pointerEvents: 'none',
    zIndex: 0,
  },
  // Method section override: tighter top padding so copy sits a bit higher
  methodSection: { paddingTop: 72, paddingBottom: 110 },
  // Home section override: tight top padding so the H1 sits close under the banner
  homeSection: { paddingTop: 12, paddingBottom: 110 },
  contentOver: {
    position: 'relative',
    zIndex: 1,                            // copy sits above bg video
  },

  eyebrow: {
    fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.4em',
    textTransform: 'uppercase', color: 'var(--grey-2)', marginBottom: 28,
  },
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
