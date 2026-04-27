# Deploying Blot. to Vercel + Neon

End-to-end runbook for taking this app from local dev to a live URL on Vercel,
with Neon Postgres as the database and Vercel Blob for image uploads.

Audience: someone who has the repo on their machine and a GitHub account.

---

## 0. What you are deploying

| Layer       | Tech                                        | Cost on free tier |
|-------------|---------------------------------------------|--------------------|
| App runtime | Vercel (Next.js 14 App Router)              | Free for hobby     |
| Database    | Neon Postgres (serverless)                  | Free up to 0.5 GB  |
| File store  | Vercel Blob                                 | Free up to 1 GB    |
| Auth        | HTTP Basic in front of `/admin`             | n/a                |

Total time: ~30 minutes once you have credentials.

---

## 1. Provision Neon Postgres

1. Go to https://neon.tech and sign in.
2. **Create project** → pick the region closest to your Vercel region
   (Singapore `ap-southeast-1` if you'll be picking Singapore on Vercel).
3. Copy the **pooled connection string** from the dashboard. It looks like:

   ```
   postgres://USER:PASSWORD@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

4. Apply the schema. From your local machine, in `blott-app/`:

   ```bash
   DATABASE_URL='postgres://USER:PASS@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' \
     npm run db:init
   ```

   You should see `[init-db] connected to Postgres, applying schema.postgres.sql... [init-db] done.`

5. Seed the database with the JSON fixtures (questions, ~200 perfumes, easter
   eggs, params):

   ```bash
   APP_MODE=production \
     DATABASE_URL='postgres://USER:PASS@.../neondb?sslmode=require' \
     npm run db:seed
   ```

   This UPSERTs everything from `/data/*.json`. Re-running is safe.

---

## 2. Push to GitHub

```bash
cd blott-app
git init
git add .
git commit -m "Initial commit — Blot. ready for deploy"
gh repo create blott-app --private --source=. --remote=origin --push
# or push to a repo you've already created
```

`.env.local` is gitignored by Next.js's default `.gitignore` — double-check it
before pushing if you're using a custom one.

---

## 3. Create the Vercel project

1. Go to https://vercel.com → **Add New… → Project** → import the GitHub repo.
2. **Framework Preset** auto-detects Next.js. Leave the build command and
   output directory at defaults.
3. **Root Directory** = `blott-app` (only set this if your repo root contains
   the `blott-app/` folder; if you committed from inside `blott-app/`, leave
   blank).
4. **Region** — match your Neon region (Singapore is a good default for users
   in Thailand / SEA).
5. Don't deploy yet — click **Environment Variables** first.

---

## 4. Configure environment variables on Vercel

Add these under **Settings → Environment Variables** (Production + Preview +
Development checked):

| Name                    | Value                                            |
|-------------------------|--------------------------------------------------|
| `APP_MODE`              | `production`                                     |
| `DATABASE_URL`          | the Neon pooled URL from step 1                  |
| `ADMIN_USER`            | e.g. `admin`                                     |
| `ADMIN_PASS`            | a strong password — required, or `/admin` 503s   |
| `TRACKING_ENABLED`      | `true` or `false` per your PDPA decision         |
| `EMAIL_PROVIDER`        | `stub` for now (replace later with sendgrid etc.) |
| `EMAIL_FROM`            | `hello@blott.app` (or whatever sender you own)   |

Leave `BLOB_READ_WRITE_TOKEN` blank for now — we add it in step 5.

---

## 5. Add Vercel Blob storage

1. In the project, go to **Storage → Connect Store → Blob → Create**.
2. Name it `blott-uploads`. Vercel automatically:
   - Creates the store
   - Injects `BLOB_READ_WRITE_TOKEN` into the project's env vars
   - Connects it to all environments
3. Trigger a redeploy (Settings → Deployments → Redeploy latest).

The `/api/admin/upload` route detects `BLOB_READ_WRITE_TOKEN` automatically and
switches from disk writes to `@vercel/blob.put()`.

---

## 6. First deploy

Click **Deploy**. Wait ~2 minutes.

When it's green, hit:

- `https://<your-project>.vercel.app/` → home
- `https://<your-project>.vercel.app/quiz/start` → take the quiz end-to-end
- `https://<your-project>.vercel.app/admin` → browser will prompt for
  `ADMIN_USER` / `ADMIN_PASS`

If `/admin` returns 503, you forgot `ADMIN_PASS` — set it and redeploy.

---

## 7. Custom domain (optional)

1. Vercel project → **Settings → Domains → Add** `blott.app` (or whatever).
2. Update the DNS at your registrar:
   - Apex `A` record → `76.76.21.21`
   - `www` `CNAME` → `cname.vercel-dns.com`
3. Wait for SSL to provision (a few minutes).

---

## 8. Updating perfume / question data later

Two ways:

**A. Edit through `/admin`** (recommended for small fixes)
The admin pages call the SQL adapter directly, so your edits hit Neon and are
live within seconds. The disk-mirror writes to `/data/*.json` are no-ops in
production — there's nothing to sync.

**B. Edit JSON files locally + re-seed** (for bulk changes)
```bash
# edit data/perfumes.json in your editor
APP_MODE=production DATABASE_URL=... npm run db:seed
```
The seed script is idempotent UPSERTs — existing rows update in place,
new rows are inserted, and rows you removed from JSON stay in the DB.
To wipe the perfumes table first, run:
```sql
DELETE FROM perfumes;
```
…and then re-seed.

---

## 9. Smoke testing locally before each deploy

```bash
npm run smoke         # quiz logic + JSON shape
npm run smoke:admin   # mockDb CRUD round-trips
```

Both run in seconds with no DB or Next server required.

---

## 10. Things to remember

- The serverless filesystem on Vercel is **read-only**. The admin routes
  detect this via `APP_MODE=production` and skip the disk-mirror writes;
  uploads go to Blob via the same env detection.
- The middleware locks `/admin/*` and `/api/admin/*` behind HTTP basic auth.
  Don't disable it without putting another auth layer in front.
- Neon's free tier auto-suspends after 5 minutes of inactivity. The first
  request after a cold start can take ~1 second to wake the database.
- Vercel cron / scheduled jobs are not used by this app yet — everything is
  on-demand.

---

## 11. Where to look when something breaks

| Symptom                                       | First thing to check                                  |
|-----------------------------------------------|-------------------------------------------------------|
| 503 on `/admin`                               | `ADMIN_PASS` env var unset                            |
| 401 on `/admin` even with right password      | Trailing whitespace in `ADMIN_USER` / `ADMIN_PASS`    |
| 500 on `/api/quiz/submit`                     | Vercel logs → most likely DB connection / SSL         |
| Image upload returns "BLOB token missing"     | Connect a Blob store under Storage tab, redeploy      |
| Admin shows 0 perfumes                        | Seed didn't run, or seed pointed at wrong DB          |
| `psql` errors with "SSL required"             | Append `?sslmode=require` to `DATABASE_URL`           |

Vercel logs: project → **Deployments → ⋯ → View Function Logs**.
Neon logs: dashboard → **Monitoring → Query History**.
