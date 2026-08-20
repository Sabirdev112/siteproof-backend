# SiteProof Backend

REST API for SiteProof field inspections. Workers capture on the phone; supervisors watch jobs, SOPs, and issues in the office app; n8n builds the PDF and alerts after a job is closed.

Stack: **Node 20+**, **Express**, **Postgres** (optional pgvector), modular monolith under `/api/v1`.

---

## What this repo is

| Consumer | Uses |
| --- | --- |
| Mobile (Expo) | Auth, start/close jobs, media, extract, compliance, findings |
| Admin UI | Dashboard, jobs, issues, rulebooks, org settings, Ask SOP |
| n8n | Signed `job.closed` webhook + callbacks for PDF / action log |

Contracts (do not invent new shapes):

- [`FRONTEND_API.md`](./FRONTEND_API.md) — mobile + admin
- [`N8N_WEBHOOKS.md`](./N8N_WEBHOOKS.md) — automation
- [`PHASES.md`](./PHASES.md) — build tracker / phase notes

Office UI is a **separate** repo (`siteproof-Admin-FE`). It is not published inside this backend git tree (`/dashboard` is ignored here).

---

## Requirements

- Node.js **20+**
- PostgreSQL **14+** (local via pgAdmin or Docker)
- Optional: OpenAI key for vision / Whisper / LLM verdicts (heuristics work without it)
- Optional: Docker + `pgvector/pgvector` image if you want embeddings

---

## Quick start (local)

### 1. Clone and install

```bash
git clone https://github.com/Sabirdev112/siteproof-backend.git
cd siteproof-backend
npm install
```

### 2. Create a database

In pgAdmin (or `psql`), create a database, e.g. `siteproof`.

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` at least:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | `postgres://postgres:<password>@localhost:5432/siteproof` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Long random strings |
| `WEBHOOK_SECRET` / `N8N_API_KEY` | Shared with n8n when you wire automation |
| `SKIP_PGVECTOR` | `true` on typical Windows Postgres without the extension |
| `CORS_ORIGINS` | Include Expo + admin origins (see below) |
| `PORT` | Default `3000` |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 4. Migrate and seed

```bash
npm run migrate
npm run seed
```

Seed creates one org, owner / supervisor / worker users, and the AC SOP rulebook.

### 5. Run the API

```bash
npm run dev
```

Check:

- [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)
- [http://localhost:3000/api/v1/health/ready](http://localhost:3000/api/v1/health/ready)

Production-style (no watch):

```bash
npm start
```

With `MIGRATE_ON_START=true`, migrations also run on boot (useful on Railway).

---

## Seed logins

| Role | Email | Password |
| --- | --- | --- |
| Owner | `owner@siteproof.local` | `Owner123!` |
| Supervisor | `supervisor@siteproof.local` | `Supervisor123!` |
| Worker | `worker@siteproof.local` | `Worker123!` |

Passwords can be overridden via `SEED_*` in `.env` before `npm run seed`.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | API with `--watch` |
| `npm start` | API without watch |
| `npm run migrate` | Apply `migrations/` |
| `npm run seed` | Org + users + AC SOP |
| `npm run smoke` | End-to-end API smoke checks |
| `npm run generate:sop` | Regenerate `data/ac-sop.pdf` |
| `npm run test:cloudinary` | Optional Cloudinary smoke |

---

## CORS and clients

Set `CORS_ORIGINS` as a comma-separated list (no trailing slash), for example:

```env
CORS_ORIGINS=http://localhost:8081,http://localhost:19006,http://localhost:5173
```

| Client | Typical URL |
| --- | --- |
| Expo web / simulator | `http://localhost:8081` or `19006` |
| Admin (Vite) | `http://localhost:5173` |
| Physical phone | Use your LAN IP in the app **and** add that origin if needed |

Mobile / admin base URL:

```text
http://localhost:3000/api/v1
```

On a real device, replace `localhost` with your machine’s LAN IP (e.g. `http://192.168.1.20:3000/api/v1`). Android emulator often needs `http://10.0.2.2:3000/api/v1`.

---

## Storage and AI

| Setting | Behaviour |
| --- | --- |
| `STORAGE_DRIVER=local` | Files under `uploads/` (default for local) |
| `STORAGE_DRIVER=cloudinary` | Requires `CLOUDINARY_*` |
| `PUBLIC_API_URL` | Public base for signed local media URLs (set when phones/n8n are not on localhost) |
| `OPENAI_API_KEY` | Vision, Whisper, embeddings, chat/verdict; without it, extract/compliance use heuristics |
| `SKIP_PGVECTOR=true` | Skip vector migration; rulebook search uses FTS / ILIKE |

---

## n8n (optional for local API)

Closing a job enqueues a signed `job.closed` event.

```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook/siteproof-job-closed
WEBHOOK_SECRET=<same as n8n HMAC secret>
N8N_API_KEY=<same as n8n X-Api-Key>
```

If `N8N_WEBHOOK_URL` is empty, close still succeeds and the outbox row is marked delivered (no webhook call). Full contract: [`N8N_WEBHOOKS.md`](./N8N_WEBHOOKS.md).

Inbound callbacks need:

- `X-Api-Key`
- `X-SiteProof-Timestamp` (within `WEBHOOK_REPLAY_WINDOW_SECONDS`, default 300)

---

## Deploy (Railway sketch)

1. Add Railway Postgres; copy `DATABASE_URL` (private URL for an API also on Railway).
2. Deploy this service with `npm start`.
3. Set variables from `.env.example` (`SKIP_PGVECTOR=false` if the Postgres image has pgvector).
4. Point mobile, admin, and n8n at the public API URL; update `CORS_ORIGINS` and `PUBLIC_API_URL`.

---

## Project layout

```text
src/
  server.js, app.js
  config/         env, roles
  db/             pool, migrate, seed
  modules/        auth, jobs, media, rulebooks, extract, compliance, …
  storage/        local | cloudinary
  queues/         in-process extract / ingest limiter
  events/         outbox → n8n
  ai/             extract, verdict, embeddings
migrations/       SQL (no ORM)
scripts/          smoke tests
```

---

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `health/ready` fails | `DATABASE_URL`, Postgres running, `npm run migrate` |
| CORS errors in browser | Origin listed in `CORS_ORIGINS` |
| Phone “Failed to fetch” | Not using `localhost` on a physical device; firewall; API running |
| `dashboard.controller` missing after clone | Pull latest `main` (API module must be tracked; only root `/dashboard` UI is ignored) |
| Extract / compliance weak | Set `OPENAI_API_KEY`; otherwise heuristics only |
| Duplicate SOP upload | API returns `409 CONFLICT` — “Rulebook already exists” |

---

## License / ownership

Private KeepCodeIn / SiteProof platform code. Share env secrets only with the mobile and n8n teammates who need them; do not commit `.env`.
