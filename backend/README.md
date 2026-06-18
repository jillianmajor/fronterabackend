# Frontera API (backend)

NestJS (TypeScript) backend for **Frontera provider scheduling**.

- **Runtime:** Node **22**
- **Deploy:** AWS Lambda + API Gateway (`serverless.yml`)
- **Data:** Supabase Postgres + Drizzle ORM
- **Auth:** Supabase JWT guard (`src/auth/`)

## Local development

**New developer?** Step-by-step guide: [docs/local-dev-setup.md](./docs/local-dev-setup.md)

### Docker (recommended)

```bash
npm run docker:up
```

Uses `.env` in this folder (only `DATABASE_URL` is overridden to the Docker Postgres service).

### Host API

```bash
cp .env.example .env
npm install
npm run start:dev
```

Health: `GET http://localhost:3000/health` · Swagger: `http://localhost:3000/api`

### Hybrid (Docker DB only)

```bash
npm run docker:db
docker compose run --rm migrate
cp .env.docker.example .env
npm install && npm run start:dev
```

## Database

| Path | Purpose |
|------|---------|
| `src/repository/persistence/db/schema.ts` | Drizzle models |
| `drizzle/` | SQL migrations |

| Script | Description |
|--------|-------------|
| `npm run db:generate` | New migration from schema |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed:all` | Catalog + test data |
| `npm run openapi:generate` | `openapi/frontera-api.yaml` |
| `npm run deploy` | Build + serverless deploy |

## Layout

```
src/           Nest modules (admin/, provider/, auth/, …)
drizzle/       Migrations
scripts/       Seeds, migrate runner, deploy
openapi/       Generated OpenAPI spec
docs/          ADRs and workflow docs
```

## Related docs

- [docs/scheduling-workflow.md](./docs/scheduling-workflow.md)
- [docs/onboarding-invite-flow.md](./docs/onboarding-invite-flow.md)
- [docs/api-auth.md](./docs/api-auth.md)
- [docs/adr/](./docs/adr/)

**Frontend** is maintained in a separate repository (`frontera-frontend` / Lovable portal). Clone alongside this repo for local full-stack dev.
