#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const envFile = process.env.ENV_FILE || path.join(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) dotenv.config({ path: envFile });
dotenv.config();

const { sqlDb } = await import('../lib/db/sqlDb.js');

const paramsRaw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'params.json'), 'utf8'));
const questionsRaw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'questions.json'), 'utf8'));
const params = {
  metaWeight: paramsRaw.metaWeight,
  clamp: paramsRaw.clamp,
  core: paramsRaw.core,
  meta: paramsRaw.meta,
};
const questions = questionsRaw.questions || [];

await sqlDb.setParams(params);
for (const question of questions) {
  await sqlDb.upsertQuestion(question);
}

const saved = await sqlDb.listQuestions();
console.log(`[sync-prod-quiz] params axes: ${(params.core || []).length + (params.meta || []).length}`);
console.log(`[sync-prod-quiz] questions upserted: ${questions.length}`);
console.log(`[sync-prod-quiz] DB questions now: ${saved.length}`);
for (const question of saved.sort((a, b) => a.order - b.order)) {
  const scoreChoices = (question.choices || []).filter((choice) => Object.keys(choice.scores || {}).length > 0).length;
  console.log(`[sync-prod-quiz] Q${question.order} ${question.id}: choices=${question.choices?.length || 0} scored=${scoreChoices} multi=${!!question.multiSelect}`);
}
