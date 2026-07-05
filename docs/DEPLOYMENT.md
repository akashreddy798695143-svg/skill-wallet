# Deployment Guide — Voice-Based Connect

This guide covers local development, production builds, environment configuration, database provisioning, the first-admin bootstrapping flow, security hardening, and the server-side-only nature of the `z-ai-web-dev-sdk`.

## 1. Prerequisites

| Tool | Version | Why |
| --- | --- | --- |
| [Bun](https://bun.sh/) | ≥ 1.3 | The project scripts and runtime assume Bun (uses `bun .next/standalone/server.js` in production). |
| Node.js | ≥ 20 (only if you prefer `npm`/`pnpm`) | Next.js 16 requires Node 20+. |
| SQLite | bundled with Bun/Node | No separate DB server needed for local dev. |
| A modern browser | latest Chrome/Firefox/Safari/Edge | Required for the in-browser Web Audio recorder and the print-to-PDF export. |

> The AI layer (`z-ai-web-dev-sdk`) is pre-installed as a dependency and does not require an external API key in this sandbox. It must be invoked **server-side only** — see section 7.

## 2. Local development

```bash
# 1. Clone and install dependencies
git clone <repo-url> my-project
cd my-project
bun install

# 2. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL (absolute path!) and JWT_SECRET

# 3. Push the Prisma schema to SQLite (creates db/custom.db)
bun run db:push

# 4. Start the dev server
bun run dev
```

The app is served at **http://localhost:3000**. The dev command also tees output to `dev.log`.

## 3. Environment variables

Voice-Based Connect reads three environment variables from `.env` (see `.env.example`):

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Prisma connection string. For SQLite use the `file:` scheme with an **absolute** path so the standalone production server can resolve it. Example: `file:/opt/voice-connect/db/custom.db`. |
| `JWT_SECRET` | ✅ (prod) | Secret used to sign session JWTs (HS256) and password-reset tokens. Generate with `openssl rand -base64 48`. If omitted, the app falls back to a hard-coded **dev-only** secret — never use this in production. |
| `NODE_ENV` | ✅ | `development` or `production`. Controls the `Secure` flag on the session cookie and Next.js build behavior. |

### Important: `DATABASE_URL` must use an absolute path

The production start command (`bun run start`) launches the standalone server from `.next/standalone/server.js`, whose working directory is `.next/standalone/`, not the project root. A relative SQLite path like `file:./db/custom.db` would resolve to the wrong location. Always use an absolute path:

```dotenv
DATABASE_URL=file:/home/z/my-project/db/custom.db
```

## 4. Database provisioning

### 4.1 Using Prisma (recommended)

```bash
bun run db:push        # Create / sync the schema (no migration history)
# — or —
bun run db:migrate     # Create + apply a versioned migration (Prisma Migrate)
```

`db:push` is the simplest path and is what the project was developed with. `db:migrate` is preferable for long-lived production deployments where you want a versioned migration history.

### 4.2 Using raw SQL

A standalone SQLite DDL equivalent to the Prisma schema lives in `database.sql`:

```bash
sqlite3 db/custom.db < database.sql
```

This is useful for environments where you want to provision the schema without running Prisma (e.g. a CI pipeline).

### 4.3 Switching to PostgreSQL

The schema is written portably. To switch providers:

1. Edit `prisma/schema.prisma`: change `provider = "sqlite"` to `provider = "postgresql"`.
2. Update `DATABASE_URL` to a Postgres connection string.
3. Re-run `bun run db:push` (or `bun run db:migrate`).
4. Review the boolean / datetime column mappings — Postgres uses native `BOOLEAN` and `TIMESTAMP` types.

## 5. Production build

```bash
# 1. Build the Next.js standalone bundle
bun run build

# 2. (Optional) verify the standalone bundle
ls .next/standalone

# 3. Start the production server
bun run start
```

What `bun run build` does:
1. `next build` produces a standalone output under `.next/standalone/`.
2. Copies `.next/static` into `.next/standalone/.next/` (the build script does this for you).
3. Copies `public/` into `.next/standalone/` so static assets resolve.

What `bun run start` does:
- Runs `NODE_ENV=production bun .next/standalone/server.js` and tees output to `server.log`.

The standalone server listens on the port specified by the `PORT` env var, defaulting to `3000`.

### 5.1 Reverse proxy (recommended)

A `Caddyfile` is included in the repo for a simple TLS-terminating reverse proxy. Put your domain in it and run:

```bash
caddy run --config Caddyfile
```

For nginx, a minimal server block:

```nginx
server {
  listen 80;
  server_name voice-connect.example.com;

  location / {
    proxy_pass         http://127.0.0.1:3000;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_set_header   Cookie            $http_cookie;

    # Allow large audio uploads (25 MB cap → 30 MB headroom)
    client_max_body_size 30m;
  }
}
```

The app reads `X-Forwarded-For` first when computing the client IP for `LoginHistory` (see `getClientIp()` in `src/lib/session.ts`). Ensure your proxy sets it correctly.

## 6. Setting the first admin

There is no seed script and no admin CLI. The role-assignment rule is implemented in `POST /api/auth/register` (`src/app/api/auth/register/route.ts`):

> **The very first user to register becomes `ADMIN`. Every subsequent registration is `USER`.**

To bootstrap a deployment:

1. Start the server.
2. Open `http://localhost:3000` (or your domain) in a browser.
3. Click **Sign up** and register with your real email + a strong password.
4. You are now the admin. The Admin view becomes available in the sidebar.

To grant admin to other users later, use the **Admin → Users** table in the UI (calls `POST /api/admin/users` with `{ userId, role: "ADMIN" }`). To revoke, set the role back to `USER`. No one can change their own role or delete their own account via the API.

## 7. `z-ai-web-dev-sdk` is server-side only

The AI features (ASR, TTS, LLM emotion/quality/speaker/evaluation) depend on the `z-ai-web-dev-sdk` package. This SDK:

- Must be imported only from server modules. The project isolates it in `src/lib/ai.ts`, which is referenced exclusively by Route Handlers under `src/app/api/**`.
- Must **never** be imported into client components. Importing it from a `"use client"` module would pull server-only dependencies into the browser bundle and break the build. The client-safe voice list was extracted to `src/lib/tts-voices.ts` precisely for this reason.
- Requires no API key in this sandbox environment. If your deployment environment provides a different SDK configuration, ensure the relevant environment variables (if any) are set on the host running the Next.js server.

If you extend the app with new AI features, keep all `z-ai-web-dev-sdk` imports inside `src/lib/ai.ts` or new server-only modules, and expose them to the client only through REST endpoints.

## 8. Filesystem layout for production

The standalone server expects these paths to be writable:

| Path | Purpose |
| --- | --- |
| `<DATABASE_URL path>` | The SQLite database file (e.g. `/opt/voice-connect/db/custom.db`) |
| `<cwd>/uploads/` | Uploaded/recorded audio artifacts. Created on demand by `ensureUploadDir()`. |

In production, make sure the user running the server has write permission to both locations. For a multi-instance deployment, replace the local disk storage with shared storage (e.g. an object store) by re-implementing `src/lib/audio.ts` against your preferred backend.

## 9. Security hardening checklist

Before exposing the app to the internet, walk through this checklist:

- [ ] **`JWT_SECRET`** is a unique, random string ≥ 32 characters (generate with `openssl rand -base64 48`).
- [ ] **`NODE_ENV=production`** is set so the `Secure` flag is added to the session cookie.
- [ ] **`DATABASE_URL`** uses an absolute path and points to a directory not served by the web server.
- [ ] **HTTPS** is enforced by your reverse proxy (Caddy auto-provisions Let's Encrypt certs; for nginx use `certbot`).
- [ ] The **`uploads/`** directory is **not** served statically. Audio is only reachable through `GET /api/audio/[id]`, which enforces ownership.
- [ ] **Reverse proxy** correctly forwards `X-Forwarded-For` so `LoginHistory.ipAddress` is meaningful.
- [ ] `client_max_body_size` (or equivalent) is set to ~30 MB so audio uploads under the 25 MB cap succeed.
- [ ] The first registered user is a trusted admin; other public signups are disabled or moderated if needed.
- [ ] Password-reset tokens are delivered via a real email channel (the sandbox returns the token in the JSON response for convenience — wire `forgot-password` to a transactional email provider before going live).
- [ ] Database backups are scheduled (at minimum, copy `db/custom.db` on a cron; better: `VACUUM INTO` for a consistent snapshot).
- [ ] Server process is supervised (systemd, pm2, Docker restart policy, etc.) and logs (`dev.log` / `server.log`) are rotated.
- [ ] CORS is not required (same-origin SPA + cookie auth) — do not add permissive CORS headers.
- [ ] Rate-limiting is applied at the proxy layer for `/api/auth/*` (brute-force protection) and for the AI routes (cost control).

## 10. Testing notes

There is no automated test suite in this project. Manual verification was performed end-to-end during development (see `worklog.md` Task 1-11):

1. **TTS round-trip**: generate speech via `POST /api/tts` → upload the resulting WAV via `POST /api/audio` → transcribe it via `POST /api/asr` and confirm the text matches.
2. **Analysis chain**: after ASR, run `emotion`, `quality`, `evaluate` and confirm each returns a valid JSON shape with real LLM content.
3. **Auth flows**: register (first user becomes admin), login, logout, forgot-password, reset-password.
4. **Admin flows**: list users, promote/demote, attempt self-role-change (should 422), attempt self-delete (should 422), delete a non-admin user.
5. **Export**: `GET /api/export?format=csv` produces a valid CSV with the expected 17 columns.
6. **Dashboard**: numbers match the underlying session rows.

When adding new features, repeat the relevant flows manually or, better, add a Vitest/Jest suite against the route handlers using a temporary SQLite file.

## 11. Quick reference — commands

| Command | What it does |
| --- | --- |
| `bun install` | Install dependencies |
| `bun run dev` | Start dev server on port 3000 |
| `bun run build` | Build the standalone production bundle |
| `bun run start` | Run the standalone production server |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push Prisma schema → SQLite (no migration history) |
| `bun run db:generate` | Regenerate the Prisma Client |
| `bun run db:migrate` | Create + apply a Prisma migration |
| `bun run db:reset` | Drop and recreate the database (DESTRUCTIVE) |

## 12. Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `PrismaClientInitializationError` at runtime | `DATABASE_URL` is missing or uses a relative path. Use an absolute `file:` path. |
| Login "works" but every authenticated route returns 401 | `JWT_SECRET` differs between the process that issued the token and the process verifying it. Restart the server after changing `.env`. |
| Audio upload returns 422 | File is too large (>25 MB) or has an unsupported MIME/extension. |
| ASR / TTS / LLM routes return 500 | The `z-ai-web-dev-sdk` could not be initialized, or the underlying service is unavailable. Check `server.log` for the stack trace. |
| Cookie is set but not sent on subsequent requests | Cookie was issued without `Secure` over HTTPS, or the client is on a different origin. Ensure same-origin requests and HTTPS in production. |
| Standalone server can't find the database | `DATABASE_URL` is relative. Always use an absolute path. |
| `uploads/` directory missing after deploy | It is created on demand by `ensureUploadDir()`; ensure the process has write permission to its working directory. |

## 13. License

This project is provided as-is for the Voice-Based Connect application. See `README.md` for licensing details.
