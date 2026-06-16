# Local backend setup (new developer)

Run the Nest API against **local Postgres in Docker**. Use the team **Supabase project for login only** (JWT); data lives in your local database.

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | **22.x** (`node -v`) |
| Docker Desktop | Latest (running) |
| Git | Clone access to the repo |

## 1. Clone and install

```bash
git clone <repo-url>
cd frontera/backend
npm install
```

## 2. Environment file

```bash
cp .env.example .env
```

Ask a teammate for these values (or copy from the shared secrets doc):

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Team Supabase project URL |
| `SUPABASE_JWT_SECRET` | Dashboard → Settings → API → JWT Secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional; needed for invite/password flows |

For local API testing you can set:

```env
AUTH_DISABLED=true
```

That skips JWT checks so you can use **Swagger** without signing in. Turn it off (`false`) when testing with the frontend.

Do **not** set `DATABASE_URL` in `.env` for the full Docker stack — Compose overrides it to local Postgres.

## 3. Start the stack

From `backend/`:

```bash
npm run docker:up
```

This starts:

1. **Postgres 16** on `localhost:5432`
2. **Migrations + seed** (catalog, test providers, sample schedule data)
3. **API** on **http://localhost:3000** (hot reload on `src/` changes)

Wait until you see:

```text
Frontera API listening on http://0.0.0.0:3000
```

**Verify**

- Health: http://localhost:3000/health
- Swagger: http://localhost:3000/api

Run in the background:

```bash
npm run docker:up:detach
```

## 4. Frontend (optional, full app)

In a second terminal:

```bash
cd ../frontend
cp .env.example .env
```

Set:

```env
VITE_SUPABASE_URL=<same project as backend SUPABASE_URL>
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key from Supabase dashboard>
VITE_FRONTERA_API_URL=http://localhost:3000
```

```bash
npm install
npm run dev
```

Open **http://localhost:8080** and sign in with a team dev account (e.g. `admin@fronterasearch.com` — get password from your lead).

The portal authenticates against **Supabase cloud**; the API reads/writes **local Postgres**. Seed data uses fixed user IDs that match the shared dev accounts.

## 5. Useful commands

| Command | When to use |
|---------|-------------|
| `npm run docker:down` | Stop containers |
| `npm run docker:reset` | Wipe DB volume and rebuild from scratch |
| `npm run docker:db` | Postgres only (API on host with `npm run start:dev`) |
| `docker compose run --rm migrate sh -c "npm run db:seed:all"` | Re-seed without wiping volume |
| `npm run db:seed:holidays` | Seed Optum clinic closure dates |
| `npm run db:seed:dev-logins` | Reset local `auth.users` passwords (host DB only; see hybrid below) |

After changing `package.json` dependencies:

```bash
docker compose build api
npm run docker:up
```

## 6. Hybrid: Postgres in Docker, API on your machine

If you prefer `npm run start:dev` on the host (faster TypeScript reload):

```bash
npm run docker:db
docker compose run --rm migrate
cp .env.docker.example .env
# Merge in SUPABASE_URL and SUPABASE_JWT_SECRET from .env.example
npm run start:dev
```

## 7. Troubleshooting

| Problem | Fix |
|---------|-----|
| Port 3000 in use | Stop other services or change the `api` port mapping in `docker-compose.yml` |
| Port 5432 in use | Stop local Postgres or change the `postgres` port mapping |
| `Cannot find module` in API container | `docker compose build api && npm run docker:up` |
| API returns 401 | Set `AUTH_DISABLED=true` in `.env` and restart, or sign in via frontend and use a valid JWT |
| Login works but API returns empty/wrong data | `SUPABASE_URL` / JWT secret must match the project you logged into; re-run `npm run docker:reset` |
| Migrations failed | `npm run docker:reset` |

## Architecture (local)

```text
Browser → Supabase Auth (cloud)     → JWT
Browser → Nest API (localhost:3000) → local Postgres (Docker)
Browser → Supabase client (some reads) → still cloud DB for notifications, etc.
```

Some frontend features (notifications bell, announcements) still read **Supabase cloud** directly. Scheduling admin/provider **writes** go through the local Nest API when `VITE_FRONTERA_API_URL=http://localhost:3000`.

## Related docs

- [docker.md](./docker.md) — Docker details
- [api-auth.md](./api-auth.md) — JWT and roles
- [../README.md](../README.md) — script reference
