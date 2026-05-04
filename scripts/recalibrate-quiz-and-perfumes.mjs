#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { parsePerfumesCsv, serializePerfumesCsv } from '../lib/perfumeCsv.js';

const ROOT = process.cwd();
const QUESTIONS_SOURCE = process.env.QUESTIONS_SOURCE || '/private/tmp/blott-prod-questions.json';
const PARAMS_SOURCE = process.env.PARAMS_SOURCE || '/private/tmp/blott-prod-params.json';
const PERFUME_CSV = process.env.PERFUME_CSV || path.join(ROOT, 'Complease Desc.csv');

const axes = [
  'Masculine', 'Maturity', 'Freshness', 'Sweetness', 'Intensity', 'Formality', 'Time',
  'Rich', 'Sport', 'Natural', 'Modern', 'Sexy', 'Luxury', 'Playful',
];

const choiceScores = {
  q1: {
    A: { Rich: -3 },
    B: { Rich: 0 },
    C: { Rich: 5 },
    D: { Rich: 10 },
  },
  q2: {
    A: { Maturity: -5, Modern: 2, Playful: 3, Freshness: 2, Rich: -1 },
    B: { Maturity: -2, Modern: 2, Playful: 2, Freshness: 1 },
    C: { Maturity: 0, Modern: 1, Sexy: 1, Freshness: 1 },
    D: { Maturity: 2, Formality: 1, Luxury: 1, Sexy: 1 },
    E: { Maturity: 5, Formality: 2, Luxury: 2, Playful: -2, Modern: -1, Intensity: 1 },
  },
  q3: {
    A: { Freshness: 1, Playful: 1, Formality: -2, Intensity: -1, Rich: -1 },
    B: { Sport: 2, Freshness: 2, Time: 2, Masculine: 1, Formality: -2 },
    C: { Modern: 2, Playful: 1, Intensity: 1, Formality: -2, Sport: 1 },
    D: { Freshness: 2, Time: 2, Playful: 2, Natural: 1, Formality: -2 },
    E: { Freshness: 1, Time: 1, Sweetness: 1, Intensity: -2, Formality: -2 },
    F: { Formality: 2, Maturity: 1, Luxury: 1, Rich: 1, Playful: -1 },
    G: { Sweetness: 1, Freshness: 1, Intensity: -2, Formality: -2, Luxury: -1 },
    H: { Modern: 2, Sport: 1, Masculine: 1, Formality: -1, Intensity: 1 },
    I: { Freshness: 1, Modern: 1, Playful: 1, Formality: -1, Time: 1 },
    J: { Modern: 1, Maturity: 1, Sexy: 1, Formality: -1, Intensity: -1 },
    K: { Playful: 2, Sweetness: 1, Modern: 1, Maturity: -2, Formality: -2 },
    L: { Sweetness: 2, Intensity: -2, Formality: -2, Maturity: -1 },
    M: { Formality: 2, Maturity: 2, Luxury: 2, Rich: 1, Playful: -2 },
    N: { Sweetness: 2, Modern: 1, Playful: 1, Freshness: 1, Formality: -1 },
    O: { Sweetness: 2, Intensity: -2, Formality: -2, Time: -2, Maturity: -1 },
    P: { Freshness: 1, Sweetness: 1, Intensity: -2, Formality: -2, Time: 1 },
  },
  q4: {
    A: { Playful: 2, Sweetness: 1, Freshness: 1 },
    B: { Sexy: 2, Intensity: 2, Time: -2, Modern: 1 },
    C: { Sweetness: 2, Maturity: 1, Intensity: -1, Natural: 1 },
    D: { Playful: 2, Modern: 1, Maturity: -2, Formality: -2 },
    E: { Sexy: 2, Intensity: 1, Sweetness: 1, Time: -1 },
    F: { Luxury: 2, Rich: 2, Formality: 2, Maturity: 1 },
    G: { Freshness: 2, Playful: 2, Sport: 1, Time: 2, Intensity: 1 },
    H: { Maturity: 2, Formality: 2, Luxury: 1, Playful: -1 },
    I: { Modern: 2, Freshness: 1, Luxury: 1 },
    J: { Intensity: 2, Sexy: 2, Masculine: 1, Modern: 1, Playful: 1 },
  },
  q5: {
    A: { Sexy: 2, Time: -2, Intensity: 2, Formality: -1 },
    B: { Modern: 1, Luxury: 1, Rich: 1, Formality: 1 },
    C: { Freshness: 2, Natural: 2, Time: 2, Sport: 1 },
    D: { Natural: 2, Sweetness: 1, Luxury: 1, Intensity: -2, Maturity: 1 },
    E: { Modern: 1, Sweetness: 1, Playful: 1, Freshness: 1, Time: 1 },
    F: { Freshness: 2, Natural: 2, Time: 2, Sport: 1, Formality: -2 },
    G: { Natural: 2, Freshness: 2, Sport: 1, Maturity: 1, Modern: -1 },
    H: { Sexy: 2, Luxury: 1, Time: -2, Intensity: 2 },
    I: { Formality: 2, Luxury: 2, Rich: 1, Modern: 1 },
    J: { Playful: 2, Modern: -1, Formality: -1, Maturity: -1 },
    K: { Playful: 2, Sweetness: 1, Formality: -1, Maturity: -1 },
    L: { Time: -1, Intensity: 1, Modern: 1, Sexy: 1 },
  },
  q6: {
    A: { Intensity: 2, Masculine: 1, Maturity: 1, Formality: -1, Modern: -1 },
    B: { Modern: 2, Intensity: 2, Masculine: 1, Sexy: 1, Playful: 1, Time: -1 },
    C: { Modern: 2, Sexy: 1, Sweetness: 1, Intensity: -1, Time: -1, Luxury: 1 },
    D: { Modern: 1, Playful: 1, Freshness: 1 },
    E: { Modern: 2, Natural: 1, Playful: 1, Sweetness: 1 },
    F: { Modern: 1, Freshness: 1, Sweetness: 1, Playful: 1, Sexy: 1 },
    G: { Modern: 2, Playful: 2, Sweetness: 1, Luxury: 1, Intensity: 1 },
    H: { Playful: 2, Modern: 1, Sweetness: 1, Maturity: -2, Formality: -1 },
  },
};

function readJson(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  return raw;
}

function compactScores(scores, { keepZero = [] } = {}) {
  const out = {};
  const zeroKeys = new Set(keepZero);
  for (const axis of axes) {
    const hasAxis = Object.prototype.hasOwnProperty.call(scores || {}, axis);
    const n = Number(scores?.[axis] || 0);
    if (n !== 0 || (hasAxis && zeroKeys.has(axis))) out[axis] = n;
  }
  return out;
}

function scoreQuestions() {
  const raw = readJson(QUESTIONS_SOURCE);
  const questions = raw.questions || [];
  for (const question of questions) {
    const key = question.order === 6 ? 'q6' : question.id;
    const map = choiceScores[key] || {};
    for (const choice of question.choices || []) {
      choice.scores = compactScores(map[choice.code] || {}, { keepZero: question.id === 'q1' ? ['Rich'] : [] });
    }
  }
  fs.writeFileSync(
    path.join(ROOT, 'data/questions.json'),
    JSON.stringify({ _note: 'Synced from production and recalibrated via scripts/recalibrate-quiz-and-perfumes.mjs', questions }, null, 2) + '\n',
  );

  for (const question of questions.filter((q) => q.order >= 3 && q.order <= 6)) {
    for (const choice of question.choices || []) {
      for (const [axis, value] of Object.entries(choice.scores || {})) {
        if (Math.abs(value) > 2) throw new Error(`${question.id} ${choice.code} ${axis}=${value} exceeds +/-2`);
      }
    }
  }
  return questions;
}

function scorePerfume(perfume) {
  const text = [
    perfume.fragrance,
    perfume.house,
    perfume.family,
    (perfume.notes || []).join(' '),
  ].join(' ').toLowerCase();
  const family = String(perfume.family || '').toLowerCase();
  const house = String(perfume.house || '').toLowerCase();
  const name = String(perfume.fragrance || '').toLowerCase();

  const s = Object.fromEntries(axes.map((axis) => [axis, 0]));
  const has = (...words) => words.some((word) => text.includes(word.toLowerCase()));
  const add = (axis, value) => { s[axis] += value; };

  if (has('citrus', 'bergamot', 'lemon', 'orange', 'mandarin', 'grapefruit', 'neroli', 'yuzu')) {
    add('Freshness', 4); add('Time', 3); add('Natural', 2); add('Intensity', -1); add('Sweetness', -1);
  }
  if (has('aquatic', 'marine', 'sea', 'water', 'ozonic', 'calone', 'cucumber')) {
    add('Freshness', 5); add('Sport', 4); add('Time', 3); add('Formality', -2); add('Intensity', -2); add('Natural', 1);
  }
  if (has('green', 'grass', 'fig leaves', 'fig leaf', 'basil', 'mint', 'galbanum', 'tea', 'matcha', 'sage', 'rosemary', 'lavender')) {
    add('Freshness', 3); add('Natural', 3); add('Time', 2); add('Sweetness', -1);
  }
  if (has('woody', 'cedar', 'sandalwood', 'vetiver', 'guaiac', 'oakmoss', 'cypress', 'pine', 'hinoki')) {
    add('Masculine', 3); add('Maturity', 2); add('Formality', 2); add('Natural', 2); add('Intensity', 1); add('Sweetness', -1);
  }
  if (has('floral', 'rose', 'jasmine', 'peony', 'lily', 'tuberose', 'gardenia', 'ylang', 'magnolia', 'violet', 'iris', 'orange blossom')) {
    add('Sweetness', 3); add('Masculine', -3); add('Natural', 1);
  }
  if (has('white floral', 'tuberose', 'gardenia', 'jasmine sambac')) {
    add('Sexy', 2); add('Intensity', 2); add('Maturity', 1); add('Sweetness', 1);
  }
  if (has('fruity', 'pear', 'peach', 'apple', 'berry', 'berries', 'blackcurrant', 'lychee', 'mango', 'pineapple', 'cherry', 'fig')) {
    add('Sweetness', 4); add('Playful', 3); add('Maturity', -2); add('Formality', -2); add('Freshness', 1);
  }
  if (has('gourmand', 'vanilla', 'tonka', 'caramel', 'chocolate', 'coffee', 'almond', 'praline', 'honey', 'marshmallow', 'coconut', 'milk', 'cream', 'sugar')) {
    add('Sweetness', 5); add('Playful', 2); add('Intensity', 2); add('Time', -3); add('Freshness', -3); add('Formality', -2); add('Natural', -2);
  }
  if (has('amber', 'oriental', 'benzoin', 'labdanum', 'resin', 'myrrh', 'olibanum')) {
    add('Intensity', 4); add('Maturity', 3); add('Time', -3); add('Luxury', 2); add('Freshness', -3); add('Sexy', 1);
  }
  if (has('spicy', 'pepper', 'pink pepper', 'cardamom', 'cinnamon', 'clove', 'saffron', 'ginger', 'nutmeg')) {
    add('Intensity', 3); add('Sexy', 1); add('Maturity', 1); add('Time', -1); add('Masculine', 1);
  }
  if (has('leather', 'tobacco', 'oud', 'agarwood', 'smoke', 'smoky', 'incense', 'rum', 'whiskey', 'boozy')) {
    add('Masculine', 4); add('Maturity', 4); add('Intensity', 5); add('Time', -4); add('Formality', 2); add('Luxury', 3); add('Freshness', -4); add('Sport', -3);
  }
  if (has('musk', 'clean', 'soap', 'laundry', 'cotton', 'skin', 'ambroxan', 'iso e super')) {
    add('Freshness', 2); add('Modern', 2); add('Intensity', -1); add('Sweetness', -1); add('Natural', -1);
  }
  if (has('powder', 'powdery', 'orris', 'iris')) {
    add('Maturity', 2); add('Formality', 2); add('Sweetness', 1); add('Intensity', -1);
  }
  if (family.includes('foug')) {
    add('Masculine', 4); add('Sport', 2); add('Freshness', 2); add('Formality', 2); add('Maturity', 2);
  }
  if (family.includes('chypre')) {
    add('Maturity', 4); add('Formality', 4); add('Luxury', 2); add('Natural', 1); add('Sweetness', -1);
  }
  if (family.includes('aromatic')) {
    add('Masculine', 2); add('Sport', 2); add('Freshness', 2); add('Natural', 2);
  }
  if (family.includes('musk')) {
    add('Modern', 2); add('Freshness', 1); add('Intensity', -1);
  }
  if (family.includes('floral')) {
    add('Masculine', -2); add('Sweetness', 2);
  }
  if (family.includes('woody')) {
    add('Masculine', 2); add('Formality', 1); add('Maturity', 1);
  }
  if (family.includes('gourmand')) {
    add('Sweetness', 2); add('Playful', 1); add('Freshness', -1);
  }

  const luxuryTen = ['amouage', 'creed', 'byredo', 'diptyque', 'killian', 'le labo', 'maison francis kurkdjian', 'parfums de marly', 'tom ford', 'jo malone', 'chanel', 'hermès'];
  const designerFive = ['acqua di parma', 'bvlgari', 'dior', 'prada', 'yves saint laurent', 'giorgio armani', 'givenchy', 'burberry', 'versace', 'jean paul gaultier', 'paco rabanne', 'dolce', 'narciso', 'maison margiela', 'viktor', 'kayali'];
  const midZero = ['calvin klein', 'davidoff', 'hugo boss', 'lacoste', 'montblanc', 'ralph lauren', 'azzaro', 'marc jacobs', 'ariana grande', 'glossier', 'issey miyake'];
  const affordable = ['w.dressroom', 'lush', 'mith', 'scene studio', 'summerstuff', 'buttefly', 'butterfly', 'tamburins'];
  if (luxuryTen.some((h) => house.includes(h))) s.Rich = 10;
  else if (designerFive.some((h) => house.includes(h))) s.Rich = 5;
  else if (midZero.some((h) => house.includes(h))) s.Rich = 0;
  else if (affordable.some((h) => house.includes(h))) s.Rich = -3;
  else s.Rich = 0;

  if (s.Rich >= 8) add('Luxury', 3);
  else if (s.Rich >= 5) add('Luxury', 1);
  else if (s.Rich <= -3) add('Luxury', -2);

  if (has('sport', 'homme sport', 'allure homme sport') || name.includes('sport')) add('Sport', 4);
  if (has('black', 'noir', 'night', 'intense', 'elixir', 'parfum')) { add('Intensity', 1); add('Time', -1); }
  if (has('eau fraiche', 'eau fraîche', 'light blue', 'cool water', 'aqua', 'acqua', 'colonia')) { add('Freshness', 2); add('Time', 1); add('Sport', 1); }

  return Object.fromEntries(axes.map((axis) => [axis, clamp(Math.round(s[axis]))]));
}

function clamp(n) {
  return Math.max(-10, Math.min(10, n));
}

function scorePerfumes(params) {
  const raw = fs.readFileSync(PERFUME_CSV, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/);
  const headerLine = lines.findIndex((line) => /^id,fragrance,house,family,notes,blurb,image,/i.test(line));
  if (headerLine < 0) throw new Error('Complease Desc.csv header not found');
  const importText = lines.slice(headerLine).join('\n');
  const { rows, errors } = parsePerfumesCsv(importText, params);
  if (errors.length) {
    console.warn('[recalibrate] CSV parse warnings:', JSON.stringify(errors.slice(0, 10)));
  }
  for (const perfume of rows) {
    perfume.dna = scorePerfume(perfume);
  }
  const csv = serializePerfumesCsv(rows, params);
  fs.writeFileSync(PERFUME_CSV, csv);
  fs.writeFileSync(
    path.join(ROOT, 'data/perfumes.json'),
    JSON.stringify({ _note: 'Recalibrated from Complease Desc.csv via scripts/recalibrate-quiz-and-perfumes.mjs', perfumes: rows }, null, 2) + '\n',
  );
  return rows;
}

const prodParams = readJson(PARAMS_SOURCE).params || readJson(PARAMS_SOURCE);
fs.writeFileSync(
  path.join(ROOT, 'data/params.json'),
  JSON.stringify({
    _note: 'Synced from production params. CORE axes get distance weight 1.0; META axes get weight = metaWeight.',
    ...prodParams,
  }, null, 2) + '\n',
);

const questions = scoreQuestions();
const perfumes = scorePerfumes(prodParams);

console.log(`[recalibrate] questions: ${questions.length}`);
console.log(`[recalibrate] perfumes: ${perfumes.length}`);
console.log(`[recalibrate] axes: ${axes.join(', ')}`);
