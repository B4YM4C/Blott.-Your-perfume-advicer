import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { localeFromCookies, localizeResult } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const trigger = await req.json();
    const locale = localeFromCookies(cookies());
    const rules = await db.listEasterEggs();
    const candidates = rules
      .filter((rule) => rule.enabled !== false)
      .filter((rule) => (rule.type || rule.constraints?.__type) === 'puzzle')
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const rule of candidates) {
      if (matchesPuzzle(rule, trigger)) {
        return NextResponse.json({
          ok: true,
          ruleId: rule.id,
          result: {
            puzzle: true,
            ruleId: rule.id,
            ruleLabel: rule.label || rule.id,
            ...localizeResult(rule.result || {}, locale),
          },
        });
      }
    }
    return NextResponse.json({ ok: true, result: null });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

function matchesPuzzle(rule, trigger) {
  const c = rule.constraints || {};
  const path = String(trigger?.path || '').toLowerCase();
  if (c.path && !pathMatches(path, c.path)) return false;

  const triggers = Array.isArray(c.triggers)
    ? c.triggers
    : String(c.trigger || '').split(/\n|,/).map((x) => x.trim()).filter(Boolean);
  if (triggers.length === 0) return false;

  const haystack = [
    trigger?.key,
    trigger?.editKey,
    trigger?.text,
    trigger?.href,
    trigger?.path,
  ].filter(Boolean).map((x) => String(x).toLowerCase());

  return triggers.some((raw) => {
    const needle = String(raw || '').trim().toLowerCase();
    if (!needle) return false;
    if (needle === '*') return true;
    return haystack.some((value) => value === needle || value.includes(needle));
  });
}

function pathMatches(path, expected) {
  const e = String(expected || '').toLowerCase();
  if (!e || e === '*') return true;
  return path === e || path.startsWith(e);
}
