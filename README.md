# Blot. — Web app

> Your perfume advisor. One dip. One match.

Web quiz for fragrance suggestion. Built with Next.js 14 (App Router) on the frontend and Node.js API routes on the backend.

## Quick start

```bash
cd blott-app
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000 — the quiz works **without** a database (uses an in-memory mock seeded from `data/*.json`).

Open http://localhost:3000/admin — admin back-office (no auth in beta; see `.env.example`).

## Modes

| `APP_MODE`     | Storage                                        | Use when                          |
|----------------|------------------------------------------------|-----------------------------------|
| `local` (default) | In-memory (`lib/db/mockDb.js`) seeded from JSON | Dev, demo, integration tests       |
| `production`   | SQL via mysql2 / pg (`lib/db/sqlDb.js`)         | Real deploy with persistent data   |

Switch modes by editing `.env.local` — the rest of the code never changes because both adapters expose the same interface (`lib/db/index.js`).

## Database

Schema lives in `sql/schema.sql` (MySQL 8 + comments for Postgres differences).

```bash
mysql -u blott -p blott < sql/schema.sql
```

## Quiz logic

Encoding follows the spec:

- Each question is numbered `1..N`
- Each choice is letter `A..D` (configurable up to F)
- A user's answers concat into a pattern like `1A2B3C4D5A`
- Patterns map to fragrances via `data/mappings.json` (or the `result_mappings` table)
- `*` is a wildcard — `1*2*3D4*5*` matches any user who picked C on question 3
- Pattern `default` is the catch-all

## Project layout

```
blott-app/
  app/
    layout.jsx            # global Header + Footer + ConsentBanner
    page.jsx              # landing
    components/           # Header, Footer, Logo, LoadingAnimation, ConsentBanner
    quiz/                 # quiz flow (username → questions → email)
    result/               # result page
    admin/                # back-office (questions / mappings / dashboard)
    api/
      quiz/
        questions, submit, result
      admin/
        questions, mappings
      tracking, consent, email
  lib/
    db/
      index.js            # provider switcher
      mockDb.js
      sqlDb.js
    quizLogic.js          # pattern build + match
  data/
    questions.json
    mappings.json
  sql/
    schema.sql
```

## PDPA / Tracking

All tracking respects user consent (Thailand PDPA B.E. 2562). The `ConsentBanner` shows on first visit; rejecting it disables `/api/tracking` writes but keeps the quiz functional.
