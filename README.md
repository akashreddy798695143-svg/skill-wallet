# Voice-Based Connect

> AI-powered speech-intelligence platform: record your voice, transcribe it, detect emotion, verify the speaker, measure audio quality, and get instant AI evaluation feedback — all in a single-page web app.

Voice-Based Connect is a production-ready Next.js 16 application that combines an in-browser recording studio, a server-side AI pipeline (speech-to-text, text-to-speech, and LLM-driven analyses), a personal analytics dashboard, session history with CSV/PDF export, and an admin panel — backed by a relational SQLite database and on-disk audio storage.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Screenshots](#screenshots)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Running the App](#running-the-app)
- [Project Structure](#project-structure)
- [Usage Guide](#usage-guide)
- [API Summary](#api-summary)
- [Security Notes](#security-notes)
- [Testing Notes](#testing-notes)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

Voice-Based Connect lets a user sign in, record or upload spoken audio, and immediately see a full AI analysis of their speech:

1. **Record / upload** audio in the Studio.
2. **Transcribe** it with the ASR service (z-ai-web-dev-sdk).
3. **Detect emotion** from the transcript.
4. **Analyze audio quality** (clarity, fluency, pronunciation, grammar, vocabulary, confidence, pauses, pitch, volume, WPM) by combining client-side Web Audio metrics with an LLM analysis.
5. **Verify the speaker** by comparing the session transcript to a reference audio sample.
6. **Get an AI evaluation** with six sub-scores, an overall score, a rating, and a structured feedback report (strengths, weaknesses, improvement tips, recommended practice, pronunciation / vocabulary / grammar suggestions).
7. **Track progress** on the Dashboard with weekly / monthly performance charts.
8. **Review history**, search/filter past sessions, and export to CSV or print-to-PDF.
9. **Admin** users get a system-wide view: total users, sessions, audio files, login audit trail, rating distribution, and user management.

The whole product runs as a **single-page app** on the `/` route with a **REST API** under `/api`.

---

## Features

### Authentication & Accounts
- Email + password registration and login with bcrypt password hashing.
- JWT sessions in **httpOnly cookies** (jose HS256, 7-day TTL).
- Forgot / reset password flow (1-hour reset tokens).
- **First signup becomes ADMIN** automatically; subsequent signups are USER.
- Login audit trail (IP, user-agent, success/failure) in `LoginHistory`.

### Studio
- In-browser recorder using the Web Audio API with live metrics extraction (RMS volume, noise floor, pitch via autocorrelation).
- Audio library: list, play, download, delete.
- Upload support for WAV, MP3, M4A, AAC, OGG, WEBM up to 25 MB.
- Word-by-word transcript reveal.
- Five live analysis panels: **Emotion** (pie chart), **Speaker Verification** (reference selector), **Audio Quality** (metric bars), **AI Evaluation** (score ring + 6 sub-score bars), **Feedback Report** (structured lists).

### Text-to-Speech
- Type any text (up to 4000 chars), pick from 7 voices, adjust speed.
- Generate WAV / MP3 audio with sentence-boundary chunking for long input.
- In-browser playback + download.

### Dashboard
- 4 stat cards: total sessions, average score, highest score.
- Emotion pie chart, rating bar chart, score-trend line chart.
- Weekly and monthly performance charts.
- Recent sessions list.

### History
- Full-text search across titles and transcripts.
- Filter by rating and emotion; sort newest / oldest / best / worst.
- Session detail dialog with all analyses.
- Delete with confirmation.
- **CSV export** of all sessions (17 columns).
- **PDF export** via print-to-PDF on a generated report window.

### Admin Panel (role-gated)
- System stat cards (users, admins, sessions, audio files, transcripts, reports, average score).
- Rating distribution chart.
- Login audit history.
- User management table: promote/demote, delete (cannot demote/delete self; cannot delete other admins).
- Recent system-wide sessions.

### UX
- Dark / light theme with no flash-of-wrong-theme on load.
- Glassmorphism landing page with animated waveform hero.
- Responsive sidebar + topbar shell with mobile drawer.
- Sonner toast notifications.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript 5 |
| Runtime | Bun (≥ 1.3) |
| Database | SQLite via Prisma 6 |
| Auth | bcryptjs + jose (JWT in httpOnly cookies) |
| AI SDK | `z-ai-web-dev-sdk` (ASR, TTS, LLM) |
| Styling | Tailwind CSS 4 + shadcn/ui + Radix primitives |
| Charts | Recharts |
| State | Zustand + React Query |
| Forms | react-hook-form + zod |
| Notifications | Sonner |
| Animations | Framer Motion |

---

## Screenshots

> Add screenshots here once captured. Suggested placements:
>
> ![Landing page](docs/screenshots/landing.png)
> ![Studio with analysis](docs/screenshots/studio.png)
> ![Dashboard](docs/screenshots/dashboard.png)
> ![History](docs/screenshots/history.png)
> ![Admin](docs/screenshots/admin.png)

---

## Prerequisites

- **Bun** ≥ 1.3 — install from <https://bun.sh/> (Node.js ≥ 20 also works if you prefer npm/pnpm, but the production start script uses `bun`).
- **SQLite** — bundled with Bun/Node, no separate server required.
- A modern browser for the Web Audio recorder and print-to-PDF export.

---

## Installation

```bash
git clone <repo-url> my-project
cd my-project
bun install
```

> If you don't have Bun, `npm install` or `pnpm install` will also work; just substitute your package manager's command in the scripts below.

---

## Environment Setup

Copy the template and edit it:

```bash
cp .env.example .env
```

Required variables (see `.env.example` for full descriptions):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma connection string. Use `file:` with an **absolute** path for SQLite, e.g. `file:/home/z/my-project/db/custom.db`. |
| `JWT_SECRET` | Secret used to sign session and reset tokens. **Must** be a long random string in production. If unset, a hard-coded dev secret is used (insecure — never ship to prod). |
| `NODE_ENV` | `development` or `production`. Controls the `Secure` flag on cookies. |

Generate a strong JWT secret:

```bash
openssl rand -base64 48
# or
bun -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

---

## Database Setup

The schema lives in [`prisma/schema.prisma`](prisma/schema.prisma) and defines 10 relational models. Push it to SQLite:

```bash
bun run db:push
```

This creates (or updates) the SQLite database file at the path in `DATABASE_URL`.

Alternative options:
- `bun run db:migrate` — create and apply a versioned Prisma migration.
- `sqlite3 db/custom.db < database.sql` — apply the raw SQL DDL equivalent in [`database.sql`](database.sql).

See [`docs/ER_DIAGRAM.md`](docs/ER_DIAGRAM.md) for the full schema and relationships.

---

## Running the App

### Development

```bash
bun run dev
```

Starts the Next.js dev server on **http://localhost:3000** and tees logs to `dev.log`.

### Production

```bash
bun run build        # build the standalone bundle
bun run start        # NODE_ENV=production bun .next/standalone/server.js
```

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full production guide (reverse proxy, security hardening, first-admin bootstrap, etc.).

---

## Project Structure

```
my-project/
├── prisma/
│   └── schema.prisma                # 10-model relational schema
├── db/
│   └── custom.db                    # SQLite database file (generated)
├── uploads/                         # Disk storage for audio artifacts (generated)
├── public/                          # Static assets (logo.svg, robots.txt)
├── docs/                            # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── ER_DIAGRAM.md
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout, theme-flash script, Sonner toaster
│   │   ├── page.tsx                 # SPA shell — hydrates auth, routes Landing vs AppShell
│   │   ├── globals.css              # Tailwind + theme tokens
│   │   └── api/                     # REST Route Handlers
│   │       ├── route.ts                                  # health check
│   │       ├── auth/{register,login,logout,me,
│   │       │     forgot-password,reset-password}/route.ts
│   │       ├── audio/route.ts                            # list / upload
│   │       ├── audio/[id]/route.ts                       # get / delete
│   │       ├── sessions/route.ts                         # list / create
│   │       ├── sessions/[id]/route.ts                    # detail / delete
│   │       ├── asr/route.ts                              # transcribe
│   │       ├── tts/route.ts                              # synthesize
│   │       ├── emotion/route.ts                          # emotion detection
│   │       ├── quality/route.ts                          # quality analysis
│   │       ├── speaker-verify/route.ts                   # speaker verification
│   │       ├── evaluate/route.ts                         # AI evaluation
│   │       ├── dashboard/route.ts                        # user analytics
│   │       ├── export/route.ts                           # CSV export
│   │       └── admin/{stats,users,users/[id]}/route.ts   # admin endpoints
│   ├── components/
│   │   ├── app-shell.tsx            # Sidebar + topbar + view switcher
│   │   ├── auth/auth-modal.tsx      # Login / signup / forgot / reset modal
│   │   ├── landing/landing-page.tsx # Marketing landing page
│   │   ├── shared/                  # Brand, theme toggle, loaders, score display
│   │   ├── ui/                      # shadcn/ui primitives (button, card, dialog, ...)
│   │   └── views/                   # dashboard, studio, tts, history, admin, settings
│   ├── hooks/                       # use-audio-recorder, use-mobile, use-toast
│   └── lib/
│       ├── ai.ts                    # z-ai-web-dev-sdk wrapper (ASR/TTS/LLM) — server-only
│       ├── audio.ts                 # disk audio storage + WAV duration parsing
│       ├── auth.ts                  # bcrypt + jose JWT helpers
│       ├── api-client.ts            # client-side fetch wrapper
│       ├── db.ts                    # PrismaClient singleton
│       ├── session.ts               # requireUser / requireAdmin / errorResponse
│       ├── store.ts                 # Zustand store (auth · view · theme)
│       ├── tts-voices.ts            # client-safe voice list
│       ├── types.ts                 # shared TS types matching API shapes
│       └── utils.ts                 # cn() helper
├── .env                             # local secrets (not committed)
├── .env.example                     # template
├── database.sql                     # raw SQL DDL equivalent to schema.prisma
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── components.json                  # shadcn/ui config
└── worklog.md                       # build log
```

---

## Usage Guide

### 1. Register

Open http://localhost:3000. Click **Sign up**, enter name/email/password. The very first user becomes the **admin**; subsequent registrations are regular users. You are logged in immediately and land on the Studio.

### 2. Studio — record & analyze

1. Go to **Studio** in the sidebar.
2. Either:
   - **Record** using the in-browser recorder (grant microphone permission). Live metrics (volume, noise, pitch) are shown during recording.
   - **Upload** an existing audio file (WAV, MP3, M4A, AAC, OGG, WEBM, ≤ 25 MB).
3. The audio appears in your **Audio Library** with playback and download controls.
4. Click an audio file → **Create Session**.
5. Run the analysis pipeline in order (the UI enforces preconditions):
   - **Transcribe** (ASR) — required first.
   - **Emotion** — classifies the transcript into one of six emotions with a probability breakdown.
   - **Quality** — combines your client-side metrics with the LLM analysis to produce clarity, fluency, pronunciation, grammar, vocabulary and confidence scores plus WPM and pause count.
   - **Speaker Verification** — pick a reference audio file from your library; the system transcribes it and compares it to the session transcript to estimate a speaker-match percentage.
   - **Evaluate** — runs a single LLM call that produces the overall evaluation scores + a structured feedback report.
6. Each result is persisted to the database so you can revisit it later from History without re-running the AI.

### 3. TTS — generate speech

Switch to the **TTS** view, type or paste up to 4000 characters, pick a voice (7 available), adjust the speed slider, and click **Generate**. The synthesized audio plays inline and can be downloaded. Long input is auto-chunked on sentence boundaries.

### 4. Dashboard — track progress

Open the **Dashboard** for an aggregate view: total sessions, average and highest scores, emotion distribution, rating distribution, score trend over time, and weekly/monthly performance charts.

### 5. History — review sessions

The **History** view lists every past session with search, filters (rating, emotion), and sort (newest, oldest, best, worst). Click any session card to open a detail dialog showing the full transcript, all scores, and the structured feedback report.

### 6. Export

From History:
- **CSV export** downloads a `voice-connect-sessions-<timestamp>.csv` file with all sessions and scores.
- **PDF export** opens a print-optimized report window; use the browser's **Save as PDF** option.

### 7. Admin (admin users only)

Admin users see an **Admin** item in the sidebar with system-wide totals, a rating distribution chart, a login audit trail (last 20 attempts), recent sessions across all users, and a user management table where you can promote/demote or delete users.

### 8. Settings

The **Settings** view lets you view your profile, switch theme, and log out.

---

## API Summary

The full API reference lives in [`docs/API.md`](docs/API.md). Quick summary:

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api` | none | Health check |
| `POST` | `/api/auth/register` | none | Register (first user → admin) |
| `POST` | `/api/auth/login` | none | Login |
| `POST` | `/api/auth/logout` | none | Logout |
| `GET` | `/api/auth/me` | user | Current user |
| `POST` | `/api/auth/forgot-password` | none | Request reset token |
| `POST` | `/api/auth/reset-password` | none | Reset password with token |
| `GET` | `/api/audio` | user | List user's audio files |
| `POST` | `/api/audio` | user | Upload audio (multipart) |
| `GET` | `/api/audio/[id]` | user | Stream / download audio |
| `DELETE` | `/api/audio/[id]` | user | Delete audio |
| `GET` | `/api/sessions` | user | List sessions (search/filter/sort) |
| `POST` | `/api/sessions` | user | Create session from audio |
| `GET` | `/api/sessions/[id]` | user | Session detail with all analyses |
| `DELETE` | `/api/sessions/[id]` | user | Delete session + analyses |
| `POST` | `/api/asr` | user | Transcribe session audio |
| `POST` | `/api/tts` | user | Synthesize speech |
| `POST` | `/api/emotion` | user | Detect emotion from transcript |
| `POST` | `/api/quality` | user | Analyze audio quality |
| `POST` | `/api/speaker-verify` | user | Verify speaker against reference |
| `POST` | `/api/evaluate` | user | AI evaluation + feedback |
| `GET` | `/api/dashboard` | user | User analytics aggregate |
| `GET` | `/api/export?format=csv` | user | Export sessions as CSV |
| `GET` | `/api/admin/stats` | admin | System-wide statistics |
| `GET` | `/api/admin/users` | admin | List all users |
| `POST` | `/api/admin/users` | admin | Promote / demote a user |
| `DELETE` | `/api/admin/users/[id]` | admin | Delete a user |

---

## Security Notes

- **Passwords** are hashed with bcryptjs (salt rounds = 10). Plaintext passwords are never logged or stored.
- **Sessions** are HS256-signed JWTs (jose) carried in an `HttpOnly`, `SameSite=Lax` cookie named `vbc_session`. The `Secure` flag is added when `NODE_ENV=production`. The JWT contains `sub`, `email`, `role`, `name` and expires after 7 days.
- **Tenant isolation**: all user-facing queries scope by `userId` from the JWT. A user cannot read or modify another user's audio, sessions, or analyses.
- **Reset tokens** are 1-hour JWTs that are also persisted on the user row; both must verify before the password is changed.
- **First-user-is-admin**: there is no seed script — the very first registration becomes `ADMIN`. Subsequent registrations are `USER`.
- **Admin safeguards**: nobody can change their own role or delete their own account via the API. Admins cannot delete other admins.
- **Upload validation**: only allow-listed audio MIME types and extensions are accepted; 25 MB cap.
- **Login audit**: every login attempt is recorded with IP and user-agent in `LoginHistory`. Failed attempts return the same generic error as "user not found" to avoid email enumeration.
- **Server-only SDK**: `z-ai-web-dev-sdk` is imported only from server modules (`src/lib/ai.ts`, route handlers). The client bundle never touches it.

For the production hardening checklist, see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## Testing Notes

The project does not ship an automated test suite. Verification was performed manually end-to-end during development (see [`worklog.md`](worklog.md) Task 1-11):

1. **TTS round-trip**: generate speech → upload WAV → ASR transcribes it back verbatim.
2. **Analysis chain**: ASR → emotion → quality → evaluate all return real AI output with valid JSON shapes.
3. **Auth flows**: register (first user becomes admin), login, logout, forgot-password, reset-password.
4. **Admin flows**: list users, promote/demote, attempt self-role-change (422), attempt self-delete (422), delete a non-admin user.
5. **Export**: CSV contains all 17 expected columns; PDF export opens a printable report.
6. **Dashboard**: aggregates match the underlying session rows.

When extending the app, consider adding Vitest/Jest suites against the route handlers using a temporary SQLite file.

---

## Deployment

A complete deployment guide — local dev, production build, environment variables, database provisioning, first-admin bootstrap, security hardening, and notes on the server-side-only `z-ai-web-dev-sdk` — lives in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

Quick start:

```bash
bun install
cp .env.example .env          # then edit DATABASE_URL + JWT_SECRET
bun run db:push
bun run build
bun run start                 # listens on PORT or 3000
```

For architecture diagrams and request-flow sequences, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## License

This project is provided as-is for the Voice-Based Connect application. All rights reserved to the project authors. No open-source license is granted by default; contact the maintainers before redistributing or deploying the code in a commercial context.
# speech-reco
# skill-wallet
