import { deepMerge } from './copy';

export const SUPPORTED_LOCALES = ['th', 'en'];
export const DEFAULT_LOCALE = 'th';
export const LANGUAGE_COOKIE = 'blott_lang';

export function normalizeLocale(value) {
  const v = String(value || '').toLowerCase().slice(0, 2);
  return SUPPORTED_LOCALES.includes(v) ? v : DEFAULT_LOCALE;
}

export function localeFromCookies(cookieStore) {
  return normalizeLocale(cookieStore?.get?.(LANGUAGE_COOKIE)?.value);
}

export function localizeCopy(copy, locale = DEFAULT_LOCALE) {
  const lang = normalizeLocale(locale);
  const base = copy || {};
  if (lang === DEFAULT_LOCALE) return { ...base, _locale: lang };
  const overlay = base.i18n?.[lang] || {};
  // i18n overlays intentionally replace only translated leaves, keeping Thai
  // defaults as fallback for keys not translated yet.
  return { ...deepMergeLocale(base, overlay), _locale: lang };
}

export function localizeQuestion(question, locale = DEFAULT_LOCALE) {
  const lang = normalizeLocale(locale);
  if (!question || lang === DEFAULT_LOCALE) return question;
  const direct = question.i18n?.[lang] || {};
  const copyOverlay = question.copy?.i18n?.[lang] || {};
  const { choices: choiceOverlays = {}, copy: copyPatch, ...questionOverlay } = deepMerge(copyOverlay, direct) || {};
  const englishTitle = questionOverlay.title ?? question.subtitle ?? question.title;
  const englishSubtitle = questionOverlay.subtitle ?? null;

  return {
    ...question,
    ...questionOverlay,
    title: englishTitle,
    subtitle: englishSubtitle,
    copy: localizeCopy(deepMerge(question.copy || {}, copyPatch || {}), lang),
    choices: (question.choices || []).map((choice, index) => {
      const overlay =
        choice.i18n?.[lang] ||
        choiceOverlays?.[choice.code] ||
        choiceOverlays?.[String(index)] ||
        {};
      return {
        ...choice,
        ...overlay,
        label: overlay.label ?? choice.label,
      };
    }),
  };
}

export function localizePerfume(perfume, locale = DEFAULT_LOCALE) {
  const lang = normalizeLocale(locale);
  if (!perfume || lang === DEFAULT_LOCALE) return perfume;
  const overlay = perfume.i18n?.[lang] || {};
  return {
    ...perfume,
    ...overlay,
    family: overlay.family || perfume.family,
    notes: Array.isArray(overlay.notes) ? overlay.notes : (perfume.notes || []),
    blurb: overlay.blurb || englishPerfumeFallback(perfume),
  };
}

export function localizeResult(result, locale = DEFAULT_LOCALE, perfumeMap = null) {
  const lang = normalizeLocale(locale);
  if (!result || lang === DEFAULT_LOCALE) return result;
  let out = { ...result, ...(result.i18n?.[lang] || {}) };
  const matchedPerfume = findPerfumeForResult(out, perfumeMap);

  if (matchedPerfume) {
    const perfume = localizePerfume(matchedPerfume, lang);
    out = {
      ...out,
      fragrance: perfume.fragrance,
      house: perfume.house,
      family: perfume.family,
      notes: perfume.notes || [],
      blurb: perfume.blurb || '',
      image: perfume.image || out.image || null,
    };
  }

  out.alternatives = (out.alternatives || []).map((alt) => {
    const perfumeSource = findPerfumeForResult(alt, perfumeMap);
    const perfume = perfumeSource ? localizePerfume(perfumeSource, lang) : null;
    if (!perfume) {
      const overlay = alt.i18n?.[lang] || {};
      return { ...alt, ...overlay, notes: Array.isArray(overlay.notes) ? overlay.notes : (alt.notes || []) };
    }
    return {
      ...alt,
      fragrance: perfume.fragrance,
      house: perfume.house,
      family: perfume.family,
      notes: perfume.notes || [],
      blurb: perfume.blurb || '',
      image: perfume.image || alt.image || null,
    };
  });
  return out;
}

export function stripI18nBranches(copy) {
  if (!copy || typeof copy !== 'object') return copy;
  const { i18n, i18nMeta, ...rest } = copy;
  return rest;
}

function deepMergeLocale(base, overlay) {
  if (overlay == null) return base;
  if (base == null) return overlay;
  if (Array.isArray(base) || Array.isArray(overlay)) {
    if (!Array.isArray(base)) return overlay;
    if (!Array.isArray(overlay)) return base;
    const max = Math.max(base.length, overlay.length);
    return Array.from({ length: max }, (_, i) => {
      if (base[i] == null) return overlay[i];
      if (overlay[i] == null) return base[i];
      return deepMergeLocale(base[i], overlay[i]);
    }).filter((item) => item != null);
  }
  if (typeof base !== 'object' || typeof overlay !== 'object') {
    return overlay === '' || overlay == null ? base : overlay;
  }
  const out = { ...base };
  for (const key of Object.keys(overlay)) {
    out[key] = deepMergeLocale(base[key], overlay[key]);
  }
  return out;
}

function findPerfumeForResult(result, perfumeMap) {
  if (!result || !perfumeMap?.get) return null;
  if (result.perfumeId && perfumeMap.get(result.perfumeId)) return perfumeMap.get(result.perfumeId);
  if (result.id && perfumeMap.get(result.id)) return perfumeMap.get(result.id);

  const targetName = normalizeKey(result.fragrance);
  const targetHouse = normalizeKey(result.house);
  if (!targetName) return null;

  for (const perfume of perfumeMap.values()) {
    if (normalizeKey(perfume.fragrance) !== targetName) continue;
    if (targetHouse && normalizeKey(perfume.house) && normalizeKey(perfume.house) !== targetHouse) continue;
    return perfume;
  }
  return null;
}

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['’`´.]/g, '')
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ')
    .trim();
}

function englishPerfumeFallback(perfume) {
  const notes = Array.isArray(perfume?.notes) ? perfume.notes.filter(Boolean) : [];
  const family = perfume?.family || 'fragrance';
  const house = perfume?.house || 'this house';
  const noteText = notes.length ? ` with notes of ${notes.slice(0, 5).join(', ')}` : '';
  return `A ${family} from ${house}${noteText}. This English summary is generated from the perfume profile; edit the English cache in Admin for a more specific caption.`;
}
