import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { persistJsonSync } from '@/lib/persistJson';

export const dynamic = 'force-dynamic';

async function persistAll() {
  const questions = await db.listQuestions();
  persistJsonSync('questions.json', { _note: 'Edited via /admin/questions', questions });
}

export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    const saved = await db.upsertQuestion({ ...body, id: params.id });
    await persistAll();
    return NextResponse.json({ ok: true, question: saved });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    await db.deleteQuestion(params.id);
    await persistAll();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
