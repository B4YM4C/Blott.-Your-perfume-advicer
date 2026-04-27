import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  buildPattern,
  validateAnswer,
  scoreAnswers,
  checkEasterEggs,
  matchPerfumes,
  topReasons,
} from '@/lib/quizLogic';

export async function POST(req) {
  try {
    const body = await req.json();
    const { username, answers = [], email, skippedEmail, trackingConsent } = body;

    const [questions, params, eggs] = await Promise.all([
      db.listQuestions(),
      db.getParams(),
      db.listEasterEggs(),
    ]);
    if (questions.length === 0) {
      return NextResponse.json({ ok: false, error: 'No questions configured' }, { status: 400 });
    }

    // Validate every answer
    const enriched = [];
    for (const a of answers) {
      const v = validateAnswer(a, questions);
      if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
      enriched.push({ ...a, questionOrder: v.question.order });
    }
    if (enriched.length !== questions.length) {
      return NextResponse.json({
        ok: false,
        error: `Expected ${questions.length} answers, got ${enriched.length}`,
      }, { status: 400 });
    }

    // Persist user + session + answers
    const user = await db.createUser({ username });
    const session = await db.createSession(user.id);
    for (const a of enriched) {
      await db.saveAnswer({
        sessionId: session.id,
        questionId: a.questionId,
        questionOrder: a.questionOrder,
        choiceCode: Array.isArray(a.choiceCode) ? a.choiceCode.join('') : a.choiceCode,
      });
    }
    const pattern = buildPattern(enriched);

    // Easter-egg first
    const egg = checkEasterEggs(enriched, eggs);
    if (egg) {
      const result = {
        pattern,
        special: true,
        ruleId: egg.ruleId,
        ruleLabel: egg.ruleLabel,
        fragrance: egg.fragrance,
        house: egg.house || null,
        family: egg.family || 'Easter Egg',
        notes: egg.notes || [],
        blurb: egg.blurb || '',
        image: egg.image || null,
        vector: null,
        alternatives: [],
        reasons: [],
      };
      await db.saveResult(session.id, result);
      await db.completeSession(session.id);

      if (trackingConsent === 'accepted') {
        await db.logEvent(session.id, 'quiz_complete', { pattern, fragrance: result.fragrance, special: egg.ruleId });
      }
      if (email) await db.setUserEmail(user.id, email);

      return NextResponse.json({ ok: true, sessionId: session.id, userId: user.id, pattern, result });
    }

    // Score → vector
    const { vector } = scoreAnswers(enriched, questions, params);

    // Match
    const perfumes = await db.listPerfumes();
    if (!perfumes || perfumes.length === 0) {
      return NextResponse.json({ ok: false, error: 'No perfumes configured' }, { status: 500 });
    }
    const top = matchPerfumes(vector, perfumes, 3, params);
    const best = top[0];
    const alternatives = top.slice(1).map((t) => ({
      id: t.perfume.id,
      fragrance: t.perfume.fragrance,
      house: t.perfume.house || null,
      family: t.perfume.family || null,
      notes: t.perfume.notes || [],
      blurb: t.perfume.blurb || '',
      image: t.perfume.image || null,
      distance: Number(t.distance.toFixed(2)),
    }));
    const reasons = topReasons(vector, best.perfume.dna || {}, 3, params);

    const result = {
      pattern,
      special: false,
      fragrance: best.perfume.fragrance,
      perfumeId: best.perfume.id,
      house: best.perfume.house || null,
      family: best.perfume.family || null,
      notes: best.perfume.notes || [],
      blurb: best.perfume.blurb || '',
      image: best.perfume.image || null,
      distance: Number(best.distance.toFixed(2)),
      vector,
      alternatives,
      reasons,
    };

    await db.saveResult(session.id, result);
    await db.completeSession(session.id);

    if (email) await db.setUserEmail(user.id, email);
    if (trackingConsent === 'accepted') {
      await db.logEvent(session.id, 'quiz_complete', {
        pattern, fragrance: result.fragrance, distance: result.distance,
      });
      if (skippedEmail) await db.logEvent(session.id, 'email_skipped', {});
      else if (email) await db.logEvent(session.id, 'email_submitted', {});
    }

    return NextResponse.json({ ok: true, sessionId: session.id, userId: user.id, pattern, result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
