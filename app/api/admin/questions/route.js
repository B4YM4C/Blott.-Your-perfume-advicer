import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const FILE = path.join(process.cwd(), 'data', 'questions.json');

async function persistAll() {
  try {
    const questions = await db.listQuestions();
    fs.writeFileSync(FILE, JSON.stringify({
      _note: 'Edited via /admin/questions',
      questions,
    }, null, 2));
  } catch (e) {
    console.warn('[admin/questions] disk write failed:', e.message);
  }
}

export async function GET() {
  const questions = await db.listQuestions();
  return NextResponse.json({ ok: true, questions });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const saved = await db.upsertQuestion(body);
    await persistAll();
    return NextResponse.json({ ok: true, question: saved });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
