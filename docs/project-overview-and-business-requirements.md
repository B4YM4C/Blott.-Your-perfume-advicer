# Blot. Project Overview & Business Requirements

Version: 2026-05-02  
Project: Blot. / Try Blott - Your perfume advisor  
Primary live URL: https://tryblott.vercel.app  
Legacy live URL: https://blott-your-perfume-advicer.vercel.app

## 1. Executive Summary

Blot. is a web-based perfume recommendation quiz. The user answers a short profile quiz covering budget, age, outfit style, desired impression, favorite places, and music preference. The system converts answers into a scoring vector, compares that vector against a perfume library, and returns the closest fragrance match with notes, family, reasons, and nearby alternatives.

The product has two main surfaces:

- Public website: landing page, quiz, result page, consent banner.
- Admin back office: edit questions, choices, scoring params, perfumes, copy/theme, easter eggs, mappings, sessions, and CSV import/export.

The current system is already suitable as a beta MVP: questions and perfume data can be edited without code changes, production data can live in SQL, and the public experience can be deployed on Vercel.

## 2. Current Tech Stack

- Frontend: Next.js 14 App Router, React 18.
- Backend: Next.js API routes.
- Runtime/deploy: Vercel.
- Current free production domain: `tryblott.vercel.app`.
- Database mode:
  - Local: in-memory mock DB seeded from `data/*.json`.
  - Production: SQL adapter via `lib/db/sqlDb.js`, supporting Postgres/MySQL style usage.
- Storage:
  - JSON seed files under `data/`.
  - SQL tables in production.
  - Vercel Blob support for admin uploads when token is configured.
- Auth:
  - HTTP Basic auth for `/admin/*` and `/api/admin/*` via `middleware.js`.
- Validation:
  - `npm run smoke`
  - `npm run smoke:admin`
  - `npm run build`

## 3. Main User Journey

1. User opens the public site.
2. User sees brand, CTA, method, and project explanation.
3. User starts the quiz.
4. User enters a display name.
5. User answers all configured questions.
6. Multi-select questions allow more than one answer.
7. User optionally enters email or skips email.
8. API validates answers and creates a session.
9. System calculates user vector from answer scores.
10. System matches user vector with perfume DNA vectors.
11. Result page shows the top perfume match, reasons, key notes, family, and alternatives.
12. Result page plays result sound at 70% volume.
13. Pattern code is stored internally but not shown or returned to the public client.

## 4. Public Pages

- `/` - home page, uses editable copy/theme from admin.
- `/quiz` - interactive quiz flow.
- `/result?sid=...` - result page for a completed session.
- `/result?preview=1` - sample result preview for admin site editor.

## 5. Admin Pages

- `/admin` - dashboard overview.
- `/admin/questions` - manage quiz questions and choices.
- `/admin/params` - manage scoring axes and weight settings.
- `/admin/perfumes` - manage perfume library.
- `/admin/perfumes/export` via API - export perfume CSV.
- `/admin/perfumes/import` via API - import/upsert/replace perfume CSV.
- `/admin/easter-eggs` - manage special result rules.
- `/admin/mappings` - legacy pattern mapping table.
- `/admin/copy` - edit site copy and theme fields.
- `/admin/site-editor` - visual copy/theme editor using `data-edit-key`.
- `/admin/sessions` - inspect quiz sessions and results.

## 6. Current Data Inventory

### 6.1 Quiz Questions

Source: `data/questions.json` and production `questions` / `choices` tables.

Current setup:

| Order | ID | Question | Type | Choices |
|---:|---|---|---|---:|
| 1 | `q1` | งบประมาณของคุณ | Single-select | 4 |
| 2 | `q2` | ช่วงอายุของคุณ | Single-select | 5 |
| 3 | `q3` | ลักษณะการแต่งตัวของคุณ | Multi-select | 16 |
| 4 | `q4` | คุณอยากให้ตัวเองดูเป็นคนยังไง | Multi-select | 10 |
| 5 | `q5` | สถานที่ที่คุณชอบไป | Multi-select | 12 |
| 6 | `q0ZW17O` | เเนวเพลงที่ชอบฟัง | Multi-select | 8 |

Each choice can contain:

- `code`
- `label`
- `image`
- `images`
- `scores`

### 6.2 Scoring Params

Source: `data/params.json` and production `params` table.

Core axes, distance weight `1.0`:

- Masculine
- Maturity
- Freshness
- Sweetness
- Intensity
- Formality
- Time
- Rich
- Sport
- Natural

Meta axes, distance weight `0.5`:

- Modern
- Sexy
- Luxury
- Playful

Clamp range:

- Minimum: `-10`
- Maximum: `10`

### 6.3 Perfumes

Source: `data/perfumes.json`, CSV files, and production `perfumes` table.

Current library size:

- 167 perfume records.

Each perfume can contain:

- `id`
- `fragrance`
- `house`
- `family`
- `notes`
- `blurb`
- `image`
- `dna`

The `dna` object uses the same axes as the current params. Missing values are treated as zero during distance calculation.

### 6.4 Copy And Theme

Source: `data/copy.json` and production `site_copy` table.

Current top-level copy/theme areas:

- `theme`
- `styles`
- `home`
- `method`
- `about`
- `quiz`
- `result`

The public layout reads copy dynamically so admin changes can appear without redeploy when backed by production DB.

### 6.5 Easter Eggs

Source: `data/easterEggs.json` and production `easter_eggs` table.

Current rule count:

- 1 enabled/configured rule in seed data.

Rules use constraints by question ID and choice code. Blank/null constraint means wildcard. Rules are sorted by priority and first match wins.

### 6.6 Assets

Important public assets:

- Outfit images under `public/outfits/`.
- Result sound at `public/result-sound.mp3`.
- Video/background assets under `public/`.
- Bottle/product images under `public/bottles/` when available.

## 7. Core Logic

### 7.1 Answer Validation

File: `lib/quizLogic.js`

Validation checks:

- Question ID must exist.
- Choice code must exist in the question.
- Single-select questions reject multiple answers.
- Multi-select questions can accept an array of choice codes.
- Empty answer is rejected.

### 7.2 Pattern Creation

The system still creates an internal answer pattern for analytics/debugging:

- Single answer example: `1A2B`
- Multi-select example: `3AC`
- Full pattern example: `1B2C3AC4D5F6A`

Public behavior:

- Pattern is not displayed on the result page.
- Pattern is not returned by public quiz result API.
- Pattern can still be stored internally for admin/debug/logging.

### 7.3 Score Vector

Each choice has a `scores` object. When a user answers, the system sums the selected choices into one user vector.

Example:

```json
{
  "Freshness": 2,
  "Formality": -1,
  "Modern": 1
}
```

After accumulation, every axis is clamped to the configured range, currently `-10` to `10`.

### 7.4 Matching

The matching function compares:

- User vector from quiz answers.
- Perfume DNA vector from perfume library.

Distance formula:

- Core axes: absolute difference times `1.0`.
- Meta axes: absolute difference times `metaWeight`, currently `0.5`.

The lowest total distance becomes the top match. The next two nearest perfumes become alternatives.

### 7.5 Reasons

The result page shows top reasons by ranking axes where:

- The user has a strong preference/intensity.
- The perfume DNA is close to the user vector.
- Core/meta axis weighting is respected.

### 7.6 Easter Egg Result

Before normal scoring, the system evaluates easter-egg rules.

If a rule matches:

- It returns a special result.
- It skips normal perfume matching.
- It can show custom fragrance, house, family, notes, blurb, and image.

### 7.7 Consent And Tracking

Consent values:

- `accepted`
- `rejected`
- `withdrawn`

Tracking should only be triggered from the client when consent is accepted. Tracking payloads are intended to avoid PII.

## 8. API Inventory

### Public APIs

- `GET /api/quiz/questions` - returns active questions.
- `POST /api/quiz/submit` - validates answers, scores, stores session/result, returns session ID.
- `GET /api/quiz/result?sessionId=...` - returns public result without pattern.
- `POST /api/consent` - logs consent choice.
- `POST /api/tracking` - logs tracking event.
- `POST /api/email` - email endpoint/stub flow.

### Admin APIs

- `/api/admin/questions`
- `/api/admin/questions/[id]`
- `/api/admin/params`
- `/api/admin/perfumes`
- `/api/admin/perfumes/[id]`
- `/api/admin/perfumes/export`
- `/api/admin/perfumes/import`
- `/api/admin/easter-eggs`
- `/api/admin/easter-eggs/[id]`
- `/api/admin/mappings`
- `/api/admin/mappings/upload`
- `/api/admin/mappings/template`
- `/api/admin/copy`
- `/api/admin/upload`

All admin routes are protected by Basic Auth in production.

## 9. Database Model

Current SQL schema includes:

- `users` - user identity/display name/email.
- `sessions` - quiz sessions and completion state.
- `questions` - quiz question config.
- `choices` - choices per question with scores/images.
- `answers` - selected answer codes by session/question.
- `result_mappings` - legacy pattern mapping.
- `results` - stored result per session, including pattern internally.
- `perfumes` - perfume library and DNA.
- `params` - scoring axes and weights.
- `easter_eggs` - special rule config.
- `site_copy` - editable copy/theme JSON.
- `tracking_events` - analytics events.
- `consent_log` - consent history.

## 10. CI/CD And Web Operations

### 10.1 Current CI/CD Reality

There is no checked-in `.github/workflows` directory at the moment. So the project does not currently have GitHub Actions CI in the repository.

Current release validation is command-based:

```bash
npm run smoke
npm run smoke:admin
npm run build
```

Current deployment is Vercel-based:

```bash
npx --yes vercel deploy --prod --yes
```

Vercel then:

- Installs dependencies.
- Runs `npm run build`.
- Builds Next.js pages and serverless functions.
- Assigns the latest production deployment to `tryblott.vercel.app`.

### 10.2 Current Production Checks

After deploy, the usual sanity checks are:

```bash
curl -I https://tryblott.vercel.app/
curl -I https://tryblott.vercel.app/quiz
curl -I "https://tryblott.vercel.app/result?preview=1"
curl -s https://tryblott.vercel.app/api/quiz/questions
```

Expected:

- Public pages return `200`.
- Quiz questions API returns `ok: true`.
- Number of questions is currently `6`.

### 10.3 Recommended CI Upgrade

Add GitHub Actions later with:

- Install Node dependencies.
- Run `npm run smoke`.
- Run `npm run smoke:admin`.
- Run `npm run build`.
- Optional: deploy to Vercel only from main branch.

This would turn the current manual release checklist into real CI.

## 11. Business Requirements

Total formal Business Requirements extracted from the current project: **36 requirements**.

### Product And Public Experience

BR-001: The system shall provide a public landing page that explains the Blot. perfume advisor concept and directs users to start the quiz.

BR-002: The system shall provide a responsive public experience for desktop, tablet, and mobile users.

BR-003: The system shall support a free public URL for beta usage, currently `tryblott.vercel.app`.

BR-004: The system shall allow users to complete the perfume recommendation flow without account registration.

BR-005: The system shall ask users for a display name before starting the quiz.

BR-006: The system shall allow users to skip email collection and still view the result.

BR-007: The system shall display a perfume recommendation result after quiz completion.

BR-008: The system shall play a result sound on the result page at a controlled volume.

### Quiz And Scoring

BR-009: The system shall support configurable quiz questions.

BR-010: The system shall support both single-select and multi-select question types.

BR-011: The system shall validate every submitted answer against the current configured questions and choices.

BR-012: The system shall reject invalid choice codes.

BR-013: The system shall reject multiple answers for single-select questions.

BR-014: The system shall calculate a user preference vector from selected choice scores.

BR-015: The system shall support configurable scoring axes.

BR-016: The system shall support separate core and meta scoring axes.

BR-017: The system shall apply a lower configurable weight to meta axes during matching.

BR-018: The system shall clamp final user vector scores to the configured min/max range.

BR-019: The system shall rank perfumes by distance between user vector and perfume DNA.

BR-020: The system shall return the closest perfume as the primary result.

BR-021: The system shall return nearby perfume alternatives when available.

BR-022: The system shall generate human-readable match reasons from the strongest aligned axes.

BR-023: The system shall support special easter-egg results that can override normal matching.

BR-024: The system shall keep internal answer pattern codes hidden from public users.

### Data Management

BR-025: The system shall store and manage a perfume library with fragrance name, house, family, notes, blurb, image, and DNA.

BR-026: The system shall allow admins to edit quiz questions and choices without code changes.

BR-027: The system shall allow admins to edit scoring params without code changes.

BR-028: The system shall allow admins to export the perfume library as CSV.

BR-029: The system shall allow admins to import perfume CSV in upsert mode.

BR-030: The system shall allow admins to import perfume CSV in replace mode.

BR-031: The system shall preserve Thai text correctly in CSV export/import.

BR-032: The system shall allow admins to edit site copy and theme settings.

BR-033: The system shall store completed quiz sessions and results for admin review.

### Security, Privacy, And Operations

BR-034: The system shall protect all admin pages and admin APIs with authentication in production.

BR-035: The system shall log consent decisions for PDPA-oriented tracking behavior.

BR-036: The system shall support local development without requiring a production database.

## 12. Known Gaps And Next Recommendations

1. Add `robots.txt`, `sitemap.xml`, canonical metadata, and structured data for SEO.
2. Add GitHub Actions CI so smoke/build runs automatically before deployment.
3. Add an explicit production runbook for data backup/restore.
4. Add role-based admin auth if the admin will be used by more than one person.
5. Add automated browser/mobile tests for quiz and result pages.
6. Add result analytics dashboard for conversion, drop-off, and most-selected choices.
7. Add email provider integration if email delivery becomes a real product requirement.
8. Add custom paid domain later if SEO and brand trust become priorities.

## 13. Simple Release Checklist

Before deploy:

```bash
npm run smoke
npm run smoke:admin
npm run build
```

Deploy:

```bash
npx --yes vercel deploy --prod --yes
```

After deploy:

```bash
curl -I https://tryblott.vercel.app/
curl -I https://tryblott.vercel.app/quiz
curl -I "https://tryblott.vercel.app/result?preview=1"
curl -s https://tryblott.vercel.app/api/quiz/questions
```

