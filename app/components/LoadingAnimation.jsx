'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * LoadingAnimation — full-screen splash that plays the official .mov.
 * Sources: /public/loading.mp4 (web friendly) and /public/loading.mov (raw original)
 *
 * Behaviour:
 *  - autoplays muted (browser autoplay rules)
 *  - calls onComplete when the video ends, OR after `duration` ms as a safety net
 */
export default function LoadingAnimation({ onComplete, duration = 6000 }) {
  const videoRef = useRef(null);
  const [showFallback, setShowFallback] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.play().catch(() => setShowFallback(true));
    }
    const timer = setTimeout(() => {
      if (!finished.current) {
        finished.current = true;
        onComplete?.();
      }
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  function handleEnded() {
    if (finished.current) return;
    finished.current = true;
    onComplete?.();
  }

  return (
    <div style={styles.wrap} aria-hidden="true">
      <video
        ref={videoRef}
        style={styles.video}
        muted
        autoPlay
        playsInline
        preload="auto"
        onEnded={handleEnded}
        onError={() => setShowFallback(true)}
      >
        <source src="/loading.mp4" type="video/mp4" />
        <source src="/loading.mov" type="video/quicktime" />
      </video>

      {showFallback && (
        <div style={styles.fallback}>
          <span style={styles.brand}>Blot.</span>
          <span style={styles.meta}>One dip. One match.</span>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    position: 'fixed',
    inset: 0,
    background: 'var(--paper)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    overflow: 'hidden',
  },
  video: {
    maxWidth: 'min(72vw, 640px)',
    maxHeight: '80vh',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
    borderRadius: 'var(--radius-md)',
  },
  fallback: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
  },
  brand: {
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    fontSize: 64,
    color: 'var(--ink)',
    letterSpacing: '-.02em',
  },
  meta: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '.3em',
    textTransform: 'uppercase',
    color: 'var(--grey-3)',
  },
};
