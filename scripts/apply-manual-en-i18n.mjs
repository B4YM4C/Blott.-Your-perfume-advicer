#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const ROOT = process.cwd();
const args = parseArgs(process.argv.slice(2));
if (args.env) dotenv.config({ path: args.env });
dotenv.config();

const QUESTION_TITLES = {
  qwQnhFP: 'Your Gender',
  q1: 'What is your budget?',
  q2: 'What is your age range?',
  q3: 'Your everyday style',
  q4: 'How do you want to be perceived?',
  q5: 'Your favourite place to be',
  q0ZW17O: 'Your playlist',
};

const QUESTION_TITLES_BY_TH = {
  'เพศของคุณ': 'Your Gender',
  'งบประมาณของคุณ': 'What is your budget?',
  'ช่วงอายุของคุณ': 'What is your age range?',
  'ลักษณะการแต่งตัวของคุณ': 'Your everyday style',
  'คุณอยากให้ตัวเองดูเป็นคนยังไง': 'How do you want to be perceived?',
  'สถานที่ที่คุณชอบไป': 'Your favourite place to be',
  'เเนวเพลงที่ชอบฟัง': 'Your playlist',
};

const CHOICE_LABELS = {
  qwQnhFP: {
    A: 'Masculine',
    B: 'Feminine',
    C: 'Unisex',
    D: 'LGBTQ+ Pro Max',
  },
  q1: {
    A: 'THB 100 - 1,000',
    B: 'THB 1,000 - 3,000',
    C: 'THB 3,000 - 5,000',
    D: 'Paragon boutique budget',
  },
  q2: {
    A: '15 - 19 years old',
    B: '20 - 25 years old',
    C: '26 - 30 years old',
    D: '30 - 35 years old',
    E: '35+',
  },
  q3: {
    A: 'Casual',
    B: 'Sport',
    C: 'Street',
    D: 'Hawaii',
    E: 'Chill',
    F: 'Semi Formal',
    G: 'Comfy',
    H: 'Tech Savvy',
    I: 'Tee & Jean',
    J: 'Easy Going',
    K: 'Anime',
    L: 'Cozy',
    M: 'Formal',
    N: 'Cafe Look',
    O: 'Sleep Wear',
    P: 'Lounge Wear',
  },
  q4: {
    A: 'Friendly',
    B: 'Mysterious',
    C: 'Warm',
    D: 'Cringe-cool',
    E: 'Sexy',
    F: 'Luxurious',
    G: 'Energetic',
    H: 'Mature',
    I: 'Modern',
    J: 'Fierce',
    K: 'Introvert',
    L: 'Extrovert',
  },
  q5: {
    A: 'Bar / Club',
    B: 'Siam hangout',
    C: 'Park',
    D: 'Spa',
    E: 'Cafe',
    F: 'Beach / Sea',
    G: 'Mountains / Nature',
    H: 'Cocktail bar',
    I: 'Co-working space',
    J: 'Cosplay event',
    K: 'Board game cafe',
    L: 'Cinema',
    M: 'Matcha run',
    N: 'Office day',
  },
  q0ZW17O: {
    A: 'Leave me alone !!!!',
    B: 'Younggu / Diamond MQT / Thai Hiphop',
    C: 'HYBS / WIM / PREP / Keshi / Joji songs you cannot understand but can pose to',
    D: 'Three Man Down / Tilly Birds / GeneLab mainstream, obviously',
    E: 'Thai indie like the songs people play at Cat Expo',
    F: 'International pop: Justin / Taylor Swift / Sabrina, espresso-cappuccino energy',
    G: 'K-pop energy: Aespa / Blackpink',
    H: 'J-pop anime songs, dramatic chorus and all',
  },
};

const CHOICE_LABELS_BY_TH_TITLE = {
  'เพศของคุณ': CHOICE_LABELS.qwQnhFP,
};

const COPY_EN = {
  navigation: {
    items: [
      { key: 'home', label: 'Home', href: '/' },
      { key: 'quiz', label: 'Start Quiz', href: '/quiz' },
      { key: 'about', label: 'About', href: '/#about' },
    ],
    cta: { key: 'header-primary', label: 'Begin the dip ->', href: '/quiz' },
    ctas: [
      { key: 'header-primary', label: 'Begin the dip ->', href: '/quiz', variant: 'solid', style: {} },
    ],
  },
  home: {
    lead: 'Answer a short quiz and let Blot. narrow your fragrance match. No signup, no login, just a few thoughtful dips.',
    sections: [
      {
        id: 'friendly',
        variant: 'editorial-card',
        enabled: true,
        eyebrow: 'Content box · Editable',
        title: 'Your scent should feel like you.',
        body: 'This content box can be added, removed, reordered, and edited from the CMS for campaigns or future pages.',
        ctaLabel: 'Start the quiz ->',
        ctaHref: '/quiz',
      },
    ],
  },
  method: {
    steps: [
      { title: 'Tell us about you', body: 'Budget, age, outfit style, favourite places, and the small cues that shape your taste.' },
      { title: 'We dip the strips', body: 'The system filters hundreds of fragrances through logic designed with real perfume thinking.' },
      { title: 'Meet your match', body: 'Get your closest fragrance with notes, reasons, and nearby alternatives.' },
    ],
  },
  about: {
    lead: 'Blot. turns a perfume testing strip into a quiz. Everyone has a scent that fits; sometimes you just need someone to narrow the shelf down to one answer.',
  },
  quiz: {
    username: {
      body: 'No account needed. Add the name you want us to use so the result feels personal.',
      missing: 'Enter a name to begin',
    },
    email: {
      body: 'Enter your email to receive the fragrance match, reasons, and nearby alternatives.',
      ctaSkip: 'Skip · view on web',
      skipNote: { body: 'You can skip email and view the result on the website immediately.' },
    },
    empty: { body: 'Ask an admin to add questions in the back office first.' },
  },
  result: {
    disclaimer: {
      eyebrow: 'Beta · Disclosure',
      body: 'This result is an early recommendation from our beta system. The answer set is still limited, and we will keep improving the logic as we collect more user feedback and data.',
    },
  },
  footer: {
    tagline: 'Your perfume advisor.',
    signature: 'One dip. One match.',
    columns: [
      {
        title: 'Discover',
        links: [
          { label: 'The Quiz', href: '/quiz' },
          { label: 'About Blot.', href: '/#about' },
          { label: 'Our Method', href: '/#method' },
          { label: 'Journal', href: '/#journal' },
        ],
      },
      {
        title: 'Legal',
        links: [
          { label: 'Privacy · PDPA', href: '/privacy' },
          { label: 'Terms of Service', href: '/terms' },
          { label: 'Cookie Policy', href: '/cookies' },
        ],
      },
      {
        title: 'Contact',
        links: [
          { label: 'hello@blott.app', href: 'mailto:hello@blott.app' },
          { label: 'Press Kit', href: '/press' },
          { label: 'Partners', href: '/partners' },
        ],
      },
    ],
    bottom: {
      copyright: 'Blot.',
      compliance: 'Made in Bangkok · Compliant with PDPA B.E. 2562',
      tagline: 'One dip. One match.',
    },
  },
  consent: {
    label: 'PDPA · Cookie Consent',
    title: 'Before we begin',
    body: 'Blot. uses cookies to remember your answers and improve the experience. We respect Thailand PDPA, and you can accept or reject tracking at any time. If you reject it, the quiz still works, but behavioural tracking stays off.',
    reject: 'Reject',
    accept: 'Accept',
  },
};

const PERFUME_BLURBS = {
  p_acqua_di_parma_fico_pandoro_di_silicio: "Warm Italian old-dog energy, Bond from Spy x Family vibes: almond-sweet, cozy, and very huggable.",
  p_acqua_di_parma_colonia: "Crisp white shirt and tailored slacks, like the polite Italian guy everyone secretly loves.",
  p_acqua_di_parma_fico_di_amari: "Chilled Italian holiday energy: short-sleeve shirt, shorts, boat shoes, casually driving a ferry.",
  p_acqua_di_parma_merto_di_panaria: "Elite-grade citrus, like catching sea breeze around the Sicilian islands.",
  p_amouage_reflection_man: "Sultan in a suit and tie walking through a skyscraper: rich enough to crush you with money.",
  p_ariana_grande_cloud: "Sexy, airy sweetness with a playful 34+35 mood.",
  p_azzaro_wanted: "A young 007 sipping a negroni.",
  p_burberry_her_edp: "British working-woman energy: mysterious, polished, and a little bossy.",
  p_burberry_mr_burberry: "British casualwear guy in scent form.",
  p_butterfly_thai_perfume_agarwood_benzoin: "A Thai perfume with identity, unexpectedly refined for the price.",
  p_butterfly_thai_perfume_bay_leaf: "A Thai perfume with identity, unexpectedly refined for the price.",
  p_bvlgari_aqva_pour_homme: "Aquaman surfaced from the ocean with a little seaweed still attached.",
  p_bvlgari_glacia_essense: "Scandinavian casual-clean guy in minimal clothes.",
  p_bvlgari_pour_homme: "Clean, handsome, polished, the kind of scent someone wants as a boyfriend.",
  p_byredo_alto_astrals: "Artsy flirt energy, soft coconut turning sweet and tempting.",
  p_byredo_bal_d_afrique: "Off-duty model in easy multicolor style.",
  p_byredo_black_saffron: "Soft-faced leather-jacket feminist boy energy.",
  p_byredo_blanche: "Clean, clean, clean, like showering ten times a day.",
  p_byredo_blibiotique: "Inspired by a library, but definitely a library for rich people.",
  p_byredo_gypsy_water: "Good-guy scent: even running a red light feels forgivable.",
  p_byredo_mojave_ghost: "The mysterious middle child, too enigmatic to stay ordinary.",
  p_calvin_klein_ck_one: "A household classic from the 90s and 2000s that still pulls attention.",
  p_calvin_klein_ck_all: "Sweet, fresh, and soft; there is more to it, but then the scent disappears...",
  p_calvin_klein_ck_be: "The owner says this one makes girls follow you back to the room.",
  p_bleu_de_chanel: "Timothee / Lisan al-Gaib from every angle.",
  p_chanel_allure_sensuelle: "Luxurious, mysterious, seductive old-money energy.",
  p_chanel_allure_homme_edition_blanche: "Painfully expensive orange ice cream, eaten at Paragon.",
  p_chanel_allure_homme_sport: "If you could own only one bottle, this is the easy answer: simply smells great.",
  p_chanel_chance_eau_tendre: "Gen Z rich-girl energy.",
  p_chanel_coco_mademoiselle_edp: "In the Hormones era, this would be pure Patty energy.",
  p_chanel_no_5_edp: "Gen A rich-girl energy, maybe from when Chanel was just founded.",
  p_creed_aventus: "90% of rich men walking in Paragon; the other 10% own it but forgot to wear it.",
  p_creed_aventus_for_her: "C-level working woman, not C-walk.",
  p_creed_green_irish_tweed: "Rich, neat, ready for the 19th hole.",
  p_creed_milisime_imperial: "Rich, neat, already on a yacht.",
  p_creed_silver_mountain_water: "Rich, neat, headed to a shareholder meeting and getting complimented by the secretary.",
  p_davidoff_cool_water: "Household classic, but in a green bottle.",
  p_dior_homme_2020: "One spray and Robert Pattinson appears.",
  p_dior_homme_intense_2011: "A groomed man browsing the fragrance department.",
  p_dior_j_adore_edp: "Bossy woman in a white suit with her favorite Starbucks cup.",
  p_dior_lucky: "Clean white florals, Paragon rich-girl only; if a man wears it, he borrowed it from his wife.",
  p_dior_rouge_trafalgar: "Very mysterious, fruity and berry-like; looking for a soulmate in a queue at old-school Boots.",
  p_dior_sakura: "A scent that teleports you to Japan: kimono, stone streets, falling sakura.",
  p_dior_sauvage_edt: "Johnny Depp from every angle.",
  p_dior_sauvage_elixir: "Johnny Depp, but with whiskey and cola.",
  p_gris_dior: "Dior house signature: flowers and earthy soil, but on skin it becomes charming gardener energy.",
  p_miss_dior_blooming_bouquet: "Boring scent of the year, lead actress category.",
  p_miss_dior_edp_2017: "This one may be discontinued; just try again, haha.",
  p_diptyque_do_son: "Clean white florals, Vietnamese rich-girl walking by the sea.",
  p_diptyque_eau_rose: "Sheer rose, like a beautiful person who does not try.",
  p_diptyque_fleur_de_peau: "Good-skin energy: no lotion needed, still smells clean.",
  p_diptyque_l_ombre_dans_l_eau: "Rose and fresh-cut grass, reading by a French garden.",
  p_diptyque_opheon: "Old Paris bar, sharp suit, cocktail in hand; to us, weirdly Sprite-like.",
  p_diptyque_philosykos: "Fig garden homeowner walking barefoot.",
  p_diptyque_tam_dao: "I do not know, but it smells like bean sprouts in boat noodles, only 8,000 baht.",
  p_light_blue_for_her: "Dream girl on a Maldives date: rare, unique, and unforgettable.",
  p_light_blue_for_men: "Handsome, rising from the sea with six-pack abs.",
  p_the_one: "Very handsome: boozy orange-negroni depth, bartender-phone-number energy.",
  p_armani_acqua_di_gio: "Back to 2015, the whole BTS train wore this.",
  p_armani_acqua_di_gio_profumo: "A rework of a legendary aquatic, now in a blue direction.",
  p_armani_code: "The best effortless handsome designer scent.",
  p_armani_stronger_with_you: "They say this unisex red flag makes jaws clench.",
  p_armani_si: "Bossy woman in a red suit with her favorite Starbucks cup.",
  p_givenchy_gentleman_edp: "Dangerous. One sniff and people turn around.",
  p_givenchy_l_interdit_edp: "Dangerous too, but lead actress category.",
  p_glossier_you: "Your skin scent, upgraded into a prettier no-makeup makeup version.",
  p_hermes_terre_d_hermes: "I tried to open my mind, but this is a pale foreigner spice vibe; test before buying.",
  p_hermes_twilly_d_hermes: "Mischievous girl with tied hair and a Hermes scarf.",
  p_hermes_un_jardin_sur_le_nil: "A Nile riverside garden: wind, green fruit, easy freshness.",
  p_hugo_boss_bottled: "Corporate man in a shirt with a stable life.",
  p_hugo_boss_bottled_night: "Works by day, gets into trouble by night.",
  p_issey_miyake_l_eau_d_issey_pour_femme: "Kind Japanese girl energy.",
  p_issey_miyake_l_eau_d_issey_pour_homme: "Japanese guy with minimal taste.",
  p_jpg_le_male_elixir: "Muscular, sweet, intentionally sexy, very flamboyant.",
  p_jpg_le_male_le_parfum: "Also flamboyant, but sweeter.",
  p_jpg_ultra_male: "Also flamboyant, sweet, and literally Ultra.",
  p_jean_paul_gaultier_le_male: "Queer-coded 2015 era club scent.",
  p_jo_malone_blackberry_bay: "Handsome like young Martin Cortes.",
  p_jo_malone_earlgrey_cucumber: "A unique tea scent; if someone wears it, they have taste.",
  p_jo_malone_english_oak_and_hazelnut: "Warm old-dog guy energy: brown tones and spring.",
  p_jo_malone_english_pear_freesia: "Siam rich-girl, but common.",
  p_jo_malone_myrrh_tonka: "Hunters wear this, but the girl still leaves with YSL MYSLF.",
  p_jo_malone_nectarine_honeysuckle: "Siam rich-girl, but red flag.",
  p_jo_malone_oud_bergamot: "Jo Malone final boss: wearable everywhere and actually lasts.",
  p_jo_malone_peony_blush_suede: "Siam rich-girl, but her mom is watching.",
  p_jo_malone_wood_sage_sea_salt: "The no-brainer pretty scent, but it lasts about 15 minutes.",
  p_kayali_yum_pistachio_gelato_33: "Parameter ice cream, not in a cup, in a spray bottle.",
  p_kilian_angels_share: "First sip of liquor moment: extremely sweet and cozy.",
  p_kilian_apple_brandy: "Apple cider, but expensive.",
  p_kilian_black_phantom: "Mysterious and confusing: liquor from one angle, coffee from another.",
  p_kilian_smoking_hot: "True to the name; at least Marlboro Red.",
  p_lush_american_cream: "Krispy Kreme with custard filling.",
  p_lush_dirty: "Mint. Do not think too hard or it becomes toothpaste.",
  p_lacoste_l_12_12_blanc: "From every angle, a polo-shirt guy going to play tennis.",
  p_le_labo_another_13: "Smells insanely good; no idea what exactly, but now it is mainstream.",
  p_le_labo_bergamote_22: "Bergamot that smells almost too real, like the whole fruit.",
  p_le_labo_santal_33: "Expensive hipster youth energy.",
  p_le_labo_the_matcha_26: "Pure matcha youth, ceremonial grade.",
  p_mith_blue_wood: "Cool wood, quiet mysterious guy, like the famous Layton but dirtier.",
  p_mith_crystal_flower: "Clear florals, effortlessly expensive beauty.",
  p_mith_horizon: "Tropical downtown fruit with sunset-at-the-horizon feeling.",
  p_mith_memories_of_the_wind: "Cool apple air, like grainy old film photos.",
  p_mith_mystery_for_him: "Mysterious man everyone looks at, though maybe because his zipper is open.",
  p_mith_nude: "Very smooth skin scent; safe blind-buy territory.",
  p_mith_silver_sparkle: "Sparkly, bright, always-positive energy.",
  p_mfk_724: "Luxury hotel soap, loud and expensive.",
  p_mfk_amyris_homme: "Handsome enough to make people turn.",
  p_mfk_aqua_universalis_forte: "Ultra-clean, just stepped out of a five-star hotel.",
  p_mfk_baccarat_rouge_540: "The most smelled perfume of this era, though mostly from dupes.",
  p_mfk_gentle_fluidity: "Soft, smooth, talkative, gets along with everyone.",
  p_mfk_oud_satin_mood: "A pale, blue-eyed exotic gentleman: light, intriguing, and extremely smooth.",
  p_margiela_replica_at_the_barber_s: "Exactly like stepping into a barbershop.",
  p_margiela_replica_beach_walk: "Smells like body lotion.",
  p_margiela_replica_by_the_fireplace: "A house fire, and I mean a real fire. Call the fire truck.",
  p_margiela_replica_coffee_break: "Ethiopian Yirgacheffe G1 coffee beans.",
  p_margiela_replica_jazz_club: "Soft booze in a jazz-bar dress code.",
  p_margiela_replica_lazy_sunday_morning: "The best office scent: lazy-looking but work-smart.",
  p_margiela_replica_matcha_meditation: "Relaxed ceremonial matcha energy.",
  p_margiela_replica_on_a_date: "A hopeful date scent: probably only expecting a date, not yet the sequel.",
  p_marc_jacobs_daisy: "Dreamy daisy-floral energy.",
  p_montblanc_explorer: "The closest Aventus copy.",
  p_montblanc_legend: "2000s CEO guy in a black suit with a pen in his pocket.",
  p_montblanc_star_walker: "Honestly zen bamboo, but hopefully not panda energy.",
  p_narciso_rodriguez_for_her_edp: "Clean skin, but more mature.",
  p_paco_rabanne_1_million: "A whole gold bar: rich clubbing energy everyone recognizes.",
  p_paco_rabanne_invictus: "Definitely gym bro.",
  p_paco_rabanne_lady_million: "Beautiful, rich, bold, impossible to miss.",
  p_paco_rabanne_olympea: "Powerful goddess energy: beautiful, capable, watched by everyone.",
  p_paco_rabanne_phantom: "Nice bottle, futuristic scent, slightly Interstellar, but it does smell good.",
  p_parfums_de_marly_delina: "Pretty-girl perfume, so pretty you would be scared to flirt.",
  p_parfums_de_marly_greenley: "Fresh green richness, old-money style.",
  p_parfums_de_marly_layton: "You do not need to be handsome, just rich; this works, proven by a friend.",
  p_parfums_de_marly_oriana: "Sweet dessert rich-girl line.",
  p_prada_candy: "Very sweet, confident woman enjoying life.",
  p_prada_luna_rosso: "Sporty scent that still reads alpha male.",
  p_prada_lhomme: "Handsome, polite, flawless office scent.",
  p_prada_paradigme: "Tom Holland ad energy: youthful, playful, composed, fresh herbal.",
  p_prada_paradoxe: "Powdery, fruity, juicy, glam-girl ready.",
  p_ralph_lauren_polo_black: "2000s guy with iced coffee and mango, yes really.",
  p_ralph_lauren_polo_blue: "Green-flag 2000s guy.",
  p_ralph_lauren_polo_red: "Red-flag 2000s guy.",
  p_ralph_lauren_polo_rush: "Modern, unique guy; one in a million.",
  p_scene_studio_matcha_101: "Matcha 101, plus fresh citrus or yuzu.",
  p_scene_studio_morning_person: "Early-riser energy: goes running, catches sunlight, lives well.",
  p_summerstuff_marine_bubble_bliss: "Floating soap bubbles, like soaking in a hotel bathtub.",
  "p_summerstuff_marine_aday at home": "Cozy vanilla wood, soft stay-at-home comfort.",
  "p_summerstuff_marine_let roll": "Sporty fruity scent at a budget price.",
  "p_summerstuff_marine_urgent call please": "Warm woody comfort with a hint of leather; Gen Z girl in a hip outfit.",
  p_summerstuff_marine_the_boogie_night: "Night-out scent, but sadly short-lived.",
  p_summerstuff_marine_kitsch: "Budget scent that smells more composed than its price.",
  p_tamburins_chamo: "Soft and gentle, Jennie Kim feeling.",
  p_tamburins_rosie: "Sheer rose, Rose-style effortless beauty.",
  p_tom_ford_bitter_peach: "Peach screaming loudly, with leafy bitterness behind it.",
  p_tom_ford_fucking_fabulous: "More mysterious than a Conan murder case.",
  p_tom_ford_lost_cherry: "Swensen's cherry, but 100 baht per spray.",
  p_tom_ford_ombre_leather: "Leather that is ridiculously cool, Top Gun jacket on a big bike.",
  p_tom_ford_oud_wood: "Successful man in a suit.",
  p_tom_ford_soleil_blanc: "On men it is angelic-handsome; on women, effortlessly chic.",
  p_tom_ford_tobacco_vanille: "Smell this and you can ask them for a cigar; they definitely brought one.",
  p_versace_eros: "Nightclub perfume 101.",
  p_versace_pour_homme_dylan_blue: "A child of Dior Sauvage and Bleu de Chanel, but more like the neighbor's kid.",
  p_viktor_rolf_flowerbomb: "Flowers screaming, full explosion.",
  p_w_dressroom_april_cotton_dress: "Clean Korean-oppa white-shirt energy on a budget.",
  p_ysl_la_nuit_de_l_homme: "Parisian jaw-clencher walking toward you.",
  p_ysl_libre_edp: "Woman-success-before-her-age energy.",
  p_ysl_myslf: "Boring male lead of the year, but everyone compliments it.",
  p_ysl_y_eau_de_parfum: "90% of guys in the bar wear this; the other 10% wear it too but smoke covers it.",
};

main().catch((err) => {
  console.error('[apply-manual-en-i18n] failed:', err);
  process.exit(1);
});

async function main() {
  const local = applyToLocalFiles();
  console.log(`[apply-manual-en-i18n] local copy updated=${local.copy}`);
  console.log(`[apply-manual-en-i18n] local questions updated=${local.questions}`);
  console.log(`[apply-manual-en-i18n] local perfumes updated=${local.perfumes}`);

  if (args.db === 'true' || args.db === '1') {
    const db = await applyToDatabase();
    console.log(`[apply-manual-en-i18n] db copy updated=${db.copy}`);
    console.log(`[apply-manual-en-i18n] db questions updated=${db.questions}`);
    console.log(`[apply-manual-en-i18n] db perfumes updated=${db.perfumes}`);
  }
}

function applyToLocalFiles() {
  const scope = args.scope || 'all';
  const copyFile = readJson('data/copy.json');
  if (scope === 'all' || scope === 'copy') {
    applyCopy(copyFile);
    writeJson('data/copy.json', copyFile);
  }

  const questionFile = readJson('data/questions.json');
  const questions = questionFile.questions || [];
  if (scope === 'all' || scope === 'questions') {
    questions.forEach(applyQuestion);
    writeJson('data/questions.json', { ...questionFile, questions });
  }

  const perfumeFile = readJson('data/perfumes.json');
  const perfumes = perfumeFile.perfumes || [];
  if (scope === 'all' || scope === 'perfumes') {
    perfumes.forEach(applyPerfume);
    writeJson('data/perfumes.json', { ...perfumeFile, perfumes });
  }

  return {
    copy: scope === 'all' || scope === 'copy',
    questions: scope === 'all' || scope === 'questions' ? questions.length : 0,
    perfumes: scope === 'all' || scope === 'perfumes' ? perfumes.length : 0,
  };
}

async function applyToDatabase() {
  const scope = args.scope || 'all';
  const { sqlDb } = await import('../lib/db/sqlDb.js');
  let copyCount = 0;
  let questionCount = 0;
  let perfumeCount = 0;

  if (scope === 'all' || scope === 'copy') {
    const copy = await sqlDb.getCopy();
    applyCopy(copy);
    await sqlDb.setCopy(copy);
    copyCount = 1;
  }

  if (scope === 'all' || scope === 'questions') {
    const questions = await sqlDb.listQuestions();
    for (const question of questions) {
      applyQuestion(question);
      await sqlDb.upsertQuestion(question);
    }
    questionCount = questions.length;
  }

  if (scope === 'all' || scope === 'perfumes') {
    const perfumes = await sqlDb.listPerfumes();
    for (const perfume of perfumes) {
      applyPerfume(perfume);
      await sqlDb.upsertPerfume(perfume);
    }
    perfumeCount = perfumes.length;
  }

  return { copy: copyCount > 0, questions: questionCount, perfumes: perfumeCount };
}

function applyCopy(copy) {
  copy.i18n = copy.i18n && typeof copy.i18n === 'object' ? copy.i18n : {};
  copy.i18n.en = deepMerge(copy.i18n.en || {}, COPY_EN);
  copy.i18nMeta = {
    ...(copy.i18nMeta || {}),
    en: {
      mode: 'manual',
      updatedAt: new Date().toISOString(),
      note: 'Manual English fields; no translation API is used.',
    },
  };
}

function applyQuestion(question) {
  const title = QUESTION_TITLES[question.id] || QUESTION_TITLES_BY_TH[question.title] || question.subtitle || question.title;
  question.subtitle = title;
  question.i18n = ensureLocale(question.i18n, 'en');
  question.i18n.en.title = title;
  delete question.i18n.en.subtitle;

  const labels = CHOICE_LABELS[question.id] || CHOICE_LABELS_BY_TH_TITLE[question.title] || {};
  for (const choice of question.choices || []) {
    choice.i18n = ensureLocale(choice.i18n, 'en');
    choice.i18n.en.label = labels[choice.code] || choice.label;
  }
}

function applyPerfume(perfume) {
  perfume.i18n = ensureLocale(perfume.i18n, 'en');
  perfume.i18n.en.fragrance = perfume.fragrance;
  perfume.i18n.en.family = perfume.family || '';
  perfume.i18n.en.notes = Array.isArray(perfume.notes) ? perfume.notes : [];
  perfume.i18n.en.blurb = PERFUME_BLURBS[perfume.id] || genericPerfumeBlurb(perfume);
}

function genericPerfumeBlurb(perfume) {
  const notes = Array.isArray(perfume.notes) ? perfume.notes.filter(Boolean).slice(0, 4) : [];
  const noteText = notes.length ? ` with ${notes.join(', ')}` : '';
  return `A ${perfume.family || 'fragrance'} profile from ${perfume.house || 'this house'}${noteText}.`;
}

function ensureLocale(root, locale) {
  const next = root && typeof root === 'object' ? root : {};
  next[locale] = next[locale] && typeof next[locale] === 'object' ? next[locale] : {};
  return next;
}

function deepMerge(a, b) {
  if (b == null) return a;
  if (a == null) return b;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(b) ? b : a;
  if (typeof a !== 'object' || typeof b !== 'object') return b;
  const out = { ...a };
  for (const key of Object.keys(b)) out[key] = deepMerge(a[key], b[key]);
  return out;
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function writeJson(relPath, value) {
  fs.writeFileSync(path.join(ROOT, relPath), `${JSON.stringify(value, null, 2)}\n`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--db') out.db = 'true';
    else if (arg.startsWith('--db=')) out.db = arg.slice('--db='.length);
    else if (arg === '--env') out.env = argv[++i];
    else if (arg.startsWith('--env=')) out.env = arg.slice('--env='.length);
    else if (arg === '--scope') out.scope = argv[++i];
    else if (arg.startsWith('--scope=')) out.scope = arg.slice('--scope='.length);
  }
  return out;
}
