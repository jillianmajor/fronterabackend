# Frontera Backend — Stack Addenda

The canonical domain glossary for Frontera lives at `../CONTEXT.md` (workspace root). Read that first. If anything in this file disagrees with the workspace one, the workspace one wins.

This file holds backend-only concepts that don't belong in the project-wide glossary: NestJS conventions, Supabase/Drizzle data access, the scheduling module layout, AWS serverless deploy, and phased delivery (Q1–Q4). Adding to the canonical glossary? Promote it up to `../CONTEXT.md`, don't add it here.

For NestJS stack conventions and feedback loops, see `CLAUDE.md` (this directory).

## Backend-specific concepts

### TOKENS-based DI

Every service is injected via the symbol-like keys in `src/config/tokens.ts`. Never `new Foo()` inline; never inject a class reference directly when a token exists for it. When introducing a new service, add a token first, then `@Inject(TOKENS.X)` at the consumer. This indirection is what makes the `Pick<Logger, 'log'>` style injection (and the test doubles that rely on it) work.

Current tokens: `DbClient`, `SchedulingRepository`, `SchedulingRepositoryLogger`, `SchedulingService`. New domain modules (auth guard, invites, exports) get their own repository/service tokens as they land.

### Repository pattern

Persistence lives under `src/repository/persistence/`:

- **`db/`** — Drizzle schema (`schema.ts`), `DbClient` wrapper, connection via `pg` `Pool` + `DATABASE_URL`.
- **`repository.ts`** — scheduling-domain queries; services depend on `ISchedulingRepository` from `interface.ts`.
- **`interface.ts`** — repository contracts and row types (`ProfileRow`, `TimeOffRequestRow`, etc.) inferred from the schema.

If a service needs Postgres, it goes through a repository. No raw SQL in services.

**AWS:** `serverless.yml` provisions S3 buckets, SES identity + IAM, and Lambda env (`SES_FROM_EMAIL`, `SES_CONFIGURATION_SET`). Email sends go through `src/repository/aws/ses.gateway.ts` (`TOKENS.SesGateway`) — not `new SESClient()` in domain services. S3 gateway for PACR uploads uses `DOCUMENTS_BUCKET`; Lambda IAM allows `PutObject`/`GetObject` on documents and exports buckets (`serverless.yml`).

### Scheduling module

`src/scheduling/` is the primary domain module (grows Q1–Q4 per the delivery plan):

| Phase | Backend focus |
|-------|----------------|
| Q1 | Supabase JWT guard, scheduling deadline rules, health |
| Q2 | `invite-provider`, `submit-availability` (PRN + set), PACR document storage (S3) |
| Q3 | `approve-request`, `deny-request`, corporate review queue, liaison email (SES) |
| Q4 | `finalize-month`, `export-master-calendar`, downstream read APIs |

Today (screen-backed routes only): `GET /admin/providers/*`, `GET|POST /admin/onboarding/*`, `GET /admin/master-availability/*`, `GET|POST /admin/schedule-change-approvals/*`, `GET /admin/prn-availability/*`; provider Screen 1 — `/provider/:providerId/*` ([0009](./docs/adr/0009-provider-availability-calendar.md)). No route guards yet (centralized JWT later).

Controllers stay thin; business rules and orchestration live in services; persistence stays in repositories.

### Request model (sync API)

Unlike QuoteLogik's OCR/LLM pipelines, the current Frontera API is **synchronous HTTP**: read/write Postgres in the request path. Long-running work in later phases (bulk export generation, heavy email batches) should follow enqueue → **202 Accepted** → consumer Lambda when SQS handlers are added — don't block the API Lambda beyond its timeout (`serverless.yml` sets API timeout to 300s; keep hot paths fast).

Local `npm run start:dev` and deployed Lambda share the same `createApp()` bootstrap. **Docker:** `npm run docker:up` runs Postgres 16 + migrate/seed + API — see [docs/docker.md](./docs/docker.md). Only `./src` is bind-mounted; rebuild the `api` image after dependency changes. Or use cloud Supabase via `DATABASE_URL`. SSL is auto-disabled for `localhost` / Docker hostname `postgres` (`DATABASE_SSL=false` optional).

### Auth

**Supabase Auth issues the JWT; Nest verifies it** on each request (`Authorization: Bearer <access_token>`). Not a separate Frontera login — see [docs/api-auth.md](./docs/api-auth.md). Validation via JWKS from `SUPABASE_URL` (or optional `SUPABASE_JWT_SECRET` for HS256). Global `SupabaseJwtGuard` + `RolesGuard` enforce auth on all routes except `@Public()` (`GET /health`, `accept-invite`). Set `AUTH_DISABLED=true` locally only when testing without a session.

Row-level security and helper functions (`has_role`, `get_user_org_ids`, `is_assigned_to`, `log_audit`) live in `drizzle/0001_supabase_rls_functions.sql` and run in Supabase Postgres. The Nest app uses a service-role or pooler connection; respect org/site scoping in repository queries when the guard is live.

### Schema ownership

The Drizzle schema in `src/repository/persistence/db/schema.ts` and migrations under `drizzle/` are this repo's view of the Supabase database. Models align with **Lovable `Frontera_Database_Schema.pdf`** (20 tables + `schedule_finalizations`). If the frontend or Supabase dashboard is the authoritative source for shared tables, keep Drizzle in sync — run `npm run db:generate` / `npm run db:migrate` for controlled changes; `npm run db:push` is dev-only and can DROP columns. Cross-repo schema changes need coordination with the frontend (see workspace ADR when written).

### Lambda wrapper

`src/lambda.ts` wraps the Nest app via `@vendia/serverless-express` for the API Lambda. Bootstrapping is shared with `src/main.ts` through `createApp()` — global filters, pipes, and Swagger setup belong in `createApp()` so both runtimes get them.

Deploy: `serverless.yml` service `frontera-scheduling`, function `api` → `dist/lambda.handler`, HTTP API `{proxy+}`.

## Pointer

- Domain vocabulary (provider, work site, PACR, review queue, etc.): `../CONTEXT.md`
- Project-level decisions: `../docs/adr/`
- Scheduling workflow (FE → tables → API backlog): [./docs/scheduling-workflow.md](./docs/scheduling-workflow.md)
- Provider invite + password setup (HTML email → `/accept-invite` form → Supabase Auth): [./docs/onboarding-invite-flow.md](./docs/onboarding-invite-flow.md)
- Backend-only decisions: `./docs/adr/` ([ADR-0001](./docs/adr/0001-optum-single-client-defer-multi-tenant.md) Optum-only; [ADR-0002](./docs/adr/0002-scheduling-workflow-backend-shape.md) Nest owns workflow rules)
- Backend stack conventions and feedback loops: `./CLAUDE.md`
