'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const STAGE = { USERNAME: 'username', QUIZ: 'quiz', EMAIL: 'email', SUBMITTING: 'submitting' };

const OUTFIT_IMAGES_BY_CHOICE = {
  q3: {
    A: ['/outfits/q3-01-casual-women.png', '/outfits/q3-01-casual-men.png'],
    B: ['/outfits/q3-02-sport-women.png', '/outfits/q3-02-sport-men.png'],
    C: ['/outfits/q3-03-street-women.png', '/outfits/q3-03-street-men.png'],
    D: ['/outfits/q3-04-hawaii-women.png', '/outfits/q3-04-hawaii-men.png'],
    E: ['/outfits/q3-05-chill-women.png', '/outfits/q3-05-chill-men.png'],
    F: ['/outfits/q3-06-semi-formal-women.png', '/outfits/q3-06-semi-formal-men.png'],
    G: ['/outfits/q3-07-comfy-women.png', '/outfits/q3-07-comfy-men.png'],
    H: ['/outfits/q3-08-tech-savvy-women.png', '/outfits/q3-08-tech-savvy-men.png'],
    I: ['/outfits/q3-09-tee-jean-women.png', '/outfits/q3-09-tee-jean-men-v2.png'],
    J: ['/outfits/q3-10-easy-going-women.png', '/outfits/q3-10-easy-going-men-v2.png'],
    K: ['/outfits/q3-11-anime-women.png', '/outfits/q3-11-anime-men-v2.png'],
    L: ['/outfits/q3-12-cozy-women.png', '/outfits/q3-12-cozy-men-v2.png'],
    M: ['/outfits/q3-13-formal-women.png', '/outfits/q3-13-formal-men-v2.png'],
    N: ['/outfits/q3-14-cafe-look-women.png', '/outfits/q3-14-cafe-look-men-v2.png'],
    O: ['/outfits/q3-15-sleep-wear-women.png', '/outfits/q3-15-sleep-wear-men-v2.png'],
    P: ['/outfits/q3-16-lounge-wear-women.png', '/outfits/q3-16-lounge-wear-men-v2.png'],
  },
};

export default function QuizClient({ questions = [], copy = {} }) {
  // Pull every editable string from copy so the admin /copy page is the
  // single source of truth. Falls back to /data/copy.json defaults via
  // mergeWithDefaults() upstream, so these reads can't be undefined.
  const c = copy.quiz || {};
  const router = useRouter();
  const stepTopRef = useRef(null);
  const [stage, setStage] = useState(STAGE.USERNAME);
  const [username, setUsername] = useState('');
  const [step, setStep] = useState(0);
  // For single-select questions answer is a string ("A").
  // For multi-select questions answer is an array (["A","C"]).
  const [answers, setAnswers] = useState({});
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const total = questions.length;
  const current = questions[step];
  const hasAnswer = (qid) => {
    const v = answers[qid];
    if (Array.isArray(v)) return v.length > 0;
    return Boolean(v);
  };
  const progress = total === 0 ? 0 : Math.round(((step + (hasAnswer(current?.id) ? 1 : 0)) / total) * 100);

  const consent = typeof window !== 'undefined'
    ? localStorage.getItem('blott_consent') || 'rejected' : 'rejected';

  // Pre-fire a tracking event when entering each stage (only if consented)
  useEffect(() => {
    if (consent !== 'accepted') return;
    fetch('/api/tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'stage_view', payload: { stage } }),
    }).catch(() => {});
  }, [stage, consent]);

  useEffect(() => {
    if (stage !== STAGE.QUIZ && stage !== STAGE.EMAIL) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const target = stepTopRef.current;
      if (!target) return;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [stage, step]);

  function selectChoice(code) {
    if (!current) return;
    // Multi-select questions toggle selection on/off.
    if (current.multiSelect) {
      setAnswers((prev) => {
        const cur = Array.isArray(prev[current.id]) ? prev[current.id] : [];
        const next = cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code];
        return { ...prev, [current.id]: next };
      });
      return;
    }
    // Single-select replaces — only one choice can ever be active.
    setAnswers((prev) => ({ ...prev, [current.id]: code }));
  }

  function confirmAnswer() {
    if (!hasAnswer(current?.id)) return;
    if (step < total - 1) setStep(step + 1);
    else setStage(STAGE.EMAIL);
  }

  async function submit({ skip = false } = {}) {
    setStage(STAGE.SUBMITTING);
    setError('');
    const payload = {
      username: username.trim() || 'Anonymous',
      answers: questions.map((q) => {
        const v = answers[q.id];
        // Always send a single-letter string for single-select questions,
        // and an array of letters for multi-select.
        const choiceCode = q.multiSelect
          ? (Array.isArray(v) ? v : (v ? [v] : []))
          : (Array.isArray(v) ? v[0] : v);
        return { questionId: q.id, choiceCode };
      }),
      email: skip ? undefined : (email.trim() || undefined),
      skippedEmail: skip,
      trackingConsent: consent,
    };
    try {
      const r = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'Submit failed');
      router.push(`/result?sid=${encodeURIComponent(d.sessionId)}`);
    } catch (e) {
      setError(e.message);
      setStage(STAGE.EMAIL);
    }
  }

  // ============================ RENDER ============================

  if (questions.length === 0) {
    return (
      <div className="container-narrow" style={{ padding: '120px 24px', textAlign: 'center' }}>
        <p className="meta" data-edit-key="quiz.empty.eyebrow">{c.empty?.eyebrow}</p>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, marginTop: 12 }} data-edit-key="quiz.empty.title">
          {c.empty?.title}
        </h2>
        <p style={{ color: 'var(--grey-2)', marginTop: 12 }} data-edit-key="quiz.empty.body">{c.empty?.body}</p>
      </div>
    );
  }

  return (
    <div className="quiz-shell" style={s.shell}>
      {/* progress strip */}
      {stage === STAGE.QUIZ && (
        <div className="quiz-progress-wrap" style={s.progressWrap} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ ...s.progressBar, width: `${progress}%` }} />
        </div>
      )}

      <div className="container-narrow quiz-frame" style={s.frame}>
        <div ref={stepTopRef} style={s.stepScrollTarget} aria-hidden="true" />
        {stage === STAGE.USERNAME && (
          <UsernameStep
            copy={c.username || {}}
            username={username}
            setUsername={setUsername}
            onContinue={() => setStage(STAGE.QUIZ)}
          />
        )}

        {stage === STAGE.QUIZ && current && (
          <QuestionStep
            question={current}
            current={step + 1}
            total={total}
            selected={answers[current.id]}
            onSelect={selectChoice}
            onConfirm={confirmAnswer}
            onBack={() => setStep(Math.max(0, step - 1))}
            canGoBack={step > 0}
            isLast={step === total - 1}
            hasAnswer={hasAnswer(current.id)}
          />
        )}

        {stage === STAGE.EMAIL && (
          <EmailStep
            copy={c.email || {}}
            email={email}
            setEmail={setEmail}
            onSubmit={() => submit({ skip: false })}
            onSkip={() => submit({ skip: true })}
            onBack={() => setStage(STAGE.QUIZ)}
            error={error}
          />
        )}

        {stage === STAGE.SUBMITTING && (
          <div style={{ textAlign: 'center', padding: '120px 0' }}>
            <p className="meta" data-edit-key="quiz.computing.eyebrow">{c.computing?.eyebrow}</p>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, marginTop: 12 }} data-edit-key="quiz.computing.title">
              {c.computing?.title}
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================ STEPS ============================

function UsernameStep({ copy = {}, username, setUsername, onContinue }) {
  return (
    <div className="quiz-step-box" style={s.stepBox}>
      <span className="meta" data-edit-key="quiz.username.eyebrow">{copy.eyebrow}</span>
      <h1 className="quiz-title" style={s.h1}>
        <span data-edit-key="quiz.username.titleA">{copy.titleA}</span>
        <br />
        <em style={s.em} data-edit-key="quiz.username.titleB">{copy.titleB}</em>
      </h1>
      <p className="quiz-body" style={s.body} data-edit-key="quiz.username.body">{copy.body}</p>
      <div style={{ marginTop: 32 }}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={copy.placeholder}
          maxLength={48}
          style={s.input}
          aria-label="Display name"
          autoFocus
        />
      </div>
      <div className="quiz-inline-actions" style={{ marginTop: 28, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="btn btn-lg" onClick={onContinue} disabled={!username.trim()} data-edit-key="quiz.username.cta">
          {copy.cta}
        </button>
        <span style={{ fontSize: 12, color: 'var(--grey-3)' }} data-edit-key="quiz.username.missing">
          {username.trim() ? '' : copy.missing}
        </span>
      </div>
    </div>
  );
}

function QuestionStep({ question, current, total, selected, onSelect, onConfirm, onBack, canGoBack, isLast, hasAnswer }) {
  const multi = !!question.multiSelect;
  const qc = question.copy || {};
  const selectedSet = new Set(
    Array.isArray(selected) ? selected : (selected ? [selected] : [])
  );
  const selectedCount = selectedSet.size;
  const questionHasImages = question.choices.some((choice) => getChoiceImages(question, choice).length > 0);

  return (
    <div className="quiz-step-box" style={s.stepBox}>
      <span className="meta quiz-question-meta" data-edit-key="quiz.question.meta">
        {qc.eyebrow || `Question · ${String(current).padStart(2, '0')} / ${String(total).padStart(2, '0')}`}
        {multi && <span style={s.multiBadge}>multi-select</span>}
      </span>
      <h2 className="quiz-question-title" style={s.h2} data-edit-key="quiz.question.title">{question.title}</h2>
      {question.subtitle && <p style={s.sub} data-edit-key="quiz.question.subtitle">{question.subtitle}</p>}
      {qc.body && <p style={s.body} data-edit-key="quiz.question.body">{qc.body}</p>}
      <p className="quiz-mode-hint" style={s.modeHint} data-edit-key="quiz.question.modeHint">
        {multi
          ? `${qc.multiHint || 'เลือกได้มากกว่า 1 ข้อ — กดอีกครั้งเพื่อยกเลิก'} ${selectedCount > 0 ? `(เลือกแล้ว ${selectedCount})` : ''}`
          : (qc.singleHint || 'เลือกได้ 1 ข้อ — เลือกอันใหม่จะเปลี่ยนคำตอบเดิม')}
      </p>

      {question.image && (
        <img src={question.image} alt="" style={s.qImage} />
      )}

      {/*
        key on the wrapping grid forces a full unmount/remount when the
        question changes, so the previous question's selected/unselected
        styles can never bleed into the new question through CSS transitions.
      */}
      <div
        key={question.id}
        className={`quiz-choices ${questionHasImages ? 'quiz-choices-with-images' : 'quiz-choices-text'}`}
        style={{ ...s.choices, ...(questionHasImages ? s.choicesWithImages : {}) }}
      >
        {question.choices.map((ch) => {
          const isSelected = selectedSet.has(ch.code);
          const imageList = getChoiceImages(question, ch);
          const hasOutfitImages = imageList.length > 0;
          return (
            <button
              // key includes question.id so React treats this as a fresh node
              // on every question change → no transition flicker.
              key={`${question.id}-${ch.code}`}
              type="button"
              onClick={() => onSelect(ch.code)}
              aria-pressed={isSelected}
              className={`quiz-choice ${hasOutfitImages ? 'quiz-choice-with-images' : 'quiz-choice-text'} ${isSelected ? 'quiz-choice-selected' : ''}`}
              style={{
                ...s.choice,
                ...(hasOutfitImages ? s.choiceWithImages : {}),
                ...(isSelected ? s.choiceSelected : {}),
              }}
            >
              {/* Selection indicator — circle for single, square for multi */}
              <span style={{ ...s.indicator, ...(isSelected ? s.indicatorOn : {}), borderRadius: multi ? 4 : 999 }}>
                {isSelected && <span style={s.indicatorMark}>{multi ? '✓' : '●'}</span>}
              </span>
              <span style={{ ...s.choiceCode, ...(isSelected ? s.choiceCodeOn : {}) }} data-edit-key="quiz.choice.code">{ch.code}</span>
              <span style={{ ...s.choiceLabel, ...(isSelected ? s.choiceLabelOn : {}) }} data-edit-key="quiz.choice.label">{ch.label}</span>
              {hasOutfitImages && (
                <span className="quiz-choice-images" style={s.choiceImages} aria-hidden="true">
                  {imageList.map((src, i) => (
                    <img key={src} className="quiz-choice-image" src={src} alt="" style={{ ...s.choiceImage, zIndex: imageList.length - i }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="quiz-actions quiz-actions-bottom" style={s.bottomActions}>
        <span className="quiz-helper" style={{ ...s.helper, textAlign: 'left' }} data-edit-key="quiz.question.helper">
          {hasAnswer
            ? (multi ? `เลือก ${selectedCount} ข้อ · Press Confirm to continue` : 'Press Confirm to continue')
            : 'เลือกอย่างน้อย 1 ข้อก่อนกด Confirm'}
        </span>
        <button
          className="btn"
          onClick={onConfirm}
          disabled={!hasAnswer}
          data-edit-key="quiz.question.confirm"
        >
          {isLast ? (qc.finishLabel || 'Confirm & Finish →') : (qc.continueLabel || 'Confirm →')}
        </button>
        <button className="btn ghost btn-sm" onClick={onBack} disabled={!canGoBack} style={s.backBelowButton} data-edit-key="quiz.question.back">
          {qc.backLabel || '← Back'}
        </button>
      </div>
    </div>
  );
}

function getChoiceImages(question, choice) {
  if (Array.isArray(choice.images) && choice.images.length > 0) return choice.images;
  const outfitImages = OUTFIT_IMAGES_BY_CHOICE[question.id]?.[choice.code];
  if (outfitImages) return outfitImages;
  return choice.image ? [choice.image] : [];
}

function EmailStep({ copy = {}, email, setEmail, onSubmit, onSkip, onBack, error }) {
  return (
    <div className="quiz-step-box" style={s.stepBox}>
      <span className="meta" data-edit-key="quiz.email.eyebrow">{copy.eyebrow}</span>
      <h2 className="quiz-title" style={s.h1}>
        <span data-edit-key="quiz.email.titleA">{copy.titleA}</span>
        <br />
        <em style={s.em} data-edit-key="quiz.email.titleB">{copy.titleB}</em>
      </h2>
      <p className="quiz-body" style={s.body} data-edit-key="quiz.email.body">{copy.body}</p>

      <div style={{ marginTop: 32 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={copy.placeholder}
          style={s.input}
          aria-label="Email address"
        />
      </div>

      {error && <p style={{ color: '#b00020', fontSize: 13, marginTop: 12 }}>{error}</p>}

      <div className="quiz-inline-actions" style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-lg" onClick={onSubmit} disabled={!email.trim()} data-edit-key="quiz.email.ctaSubmit">
          {copy.ctaSubmit}
        </button>
        <button className="btn ghost btn-lg" onClick={onSkip} data-edit-key="quiz.email.ctaSkip">
          {copy.ctaSkip}
        </button>
      </div>

      {copy.skipNote && (
        <div style={s.skipNote}>
          <span className="meta" data-edit-key="quiz.email.skipNote.eyebrow">{copy.skipNote.eyebrow}</span>
          <p style={{ marginTop: 8, color: 'var(--grey-2)', fontSize: 13 }} data-edit-key="quiz.email.skipNote.body">
            {copy.skipNote.body}
          </p>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <button className="btn ghost btn-sm" onClick={onBack} data-edit-key="quiz.email.backLabel">{copy.backLabel || '← Edit my answers'}</button>
      </div>
    </div>
  );
}

const s = {
  shell: { paddingTop: 60, paddingBottom: 120, minHeight: '70vh' },
  progressWrap: {
    height: 2, background: 'var(--grey-5)',
    position: 'fixed', top: 102, left: 0, right: 0, zIndex: 40,
  },
  progressBar: { height: 2, background: 'var(--ink)', transition: 'width .35s ease' },
  frame: { paddingTop: 60 },
  stepScrollTarget: { height: 1, scrollMarginTop: 118 },
  stepBox: { paddingTop: 20 },
  h1: { fontFamily: 'var(--font-serif)', fontSize: 'clamp(38px, 6vw, 64px)', fontWeight: 300, letterSpacing: '-.02em', lineHeight: 1, margin: '20px 0 14px' },
  h2: { fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 400, letterSpacing: '-.015em', lineHeight: 1.15, margin: '20px 0 8px' },
  em: { fontStyle: 'italic', fontWeight: 400 },
  sub: { color: 'var(--grey-2)', fontSize: 14 },
  body: { color: 'var(--grey-2)', fontSize: 15, marginTop: 12, maxWidth: 520 },
  input: {
    width: '100%', maxWidth: 520, padding: '18px 0',
    fontSize: 22, fontFamily: 'var(--font-serif)',
    background: 'transparent', border: 'none', borderBottom: '1px solid var(--ink)',
    outline: 'none', color: 'var(--ink)',
  },
  qImage: {
    maxWidth: '100%', display: 'block', margin: '24px 0',
    border: '1px solid var(--grey-5)',
  },
  choices: { display: 'grid', gap: 12, marginTop: 20 },
  choicesWithImages: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    alignItems: 'stretch',
  },
  choice: {
    display: 'flex', alignItems: 'center', gap: 16,
    flexWrap: 'wrap',
    padding: '20px 22px', textAlign: 'left', cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    // Default state always has a solid black border so the toggle is a clean
    // 2-stage flip: black-outline (unselected) ↔ black-fill (selected). No
    // intermediate grey→black ramp when navigating between questions.
    border: '1px solid var(--ink)', background: 'var(--paper)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-soft)',
    // Only transition lift + shadow. We deliberately do NOT animate
    // `border-color` or `background` — both states share the same border
    // colour, and the fill flip should be instant to avoid the previous
    // 3-stage flicker (grey → black → filled).
    transition: 'transform .18s ease, box-shadow .18s ease',
    color: 'var(--ink)',
  },
  // Strong, unmistakable selected state: dark background, white text,
  // thicker border, lifted shadow, and a filled indicator dot/check.
  choiceSelected: {
    background: 'var(--ink)',
    borderColor: 'var(--ink)',
    transform: 'translateY(-1px)',
    boxShadow: '0 12px 32px rgba(10,10,10,.22)',
  },
  indicator: {
    width: 22, height: 22,
    border: '1.5px solid var(--grey-3)',
    background: 'var(--paper)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    transition: 'border-color .15s ease',
  },
  indicatorOn: {
    background: 'var(--paper)',
    borderColor: 'var(--paper)',
    color: 'var(--ink)',
  },
  indicatorMark: {
    fontSize: 12, fontWeight: 700, color: 'var(--ink)', lineHeight: 1,
  },
  choiceCode: {
    fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '.14em',
    fontWeight: 600,
    color: 'var(--grey-3)', minWidth: 20,
  },
  choiceCodeOn: { color: 'var(--paper)' },
  choiceLabel: { fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 500, color: 'var(--ink)', flex: 1 },
  choiceLabelOn: { color: 'var(--paper)' },
  choiceWithImages: {
    alignContent: 'space-between',
    paddingTop: 18,
    paddingBottom: 20,
    minHeight: 310,
  },
  choiceImages: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginLeft: 0,
    flex: '1 0 100%',
    minWidth: 0,
    maxWidth: '100%',
  },
  choiceImage: {
    width: 'clamp(94px, 13vw, 132px)',
    height: 'clamp(190px, 26vw, 240px)',
    objectFit: 'contain',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--grey-5)',
    background: 'var(--paper)',
    boxShadow: '0 8px 20px rgba(10,10,10,.08)',
  },

  multiBadge: {
    display: 'inline-block', marginLeft: 12,
    padding: '2px 10px',
    background: 'var(--ink)', color: 'var(--paper)',
    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.2em',
    borderRadius: 999,
  },
  modeHint: {
    marginTop: 12,
    fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.18em',
    textTransform: 'uppercase', color: 'var(--grey-3)',
  },

  actions: {
    marginTop: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  bottomActions: {
    marginTop: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'column',
    gap: 10,
  },
  backBelowButton: { alignSelf: 'flex-start' },
  helper: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--grey-3)',
    letterSpacing: '.18em',
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
    minWidth: 160,
  },

  skipNote: {
    marginTop: 36, padding: 24,
    background: 'var(--offwhite)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--grey-5)',
  },
};
