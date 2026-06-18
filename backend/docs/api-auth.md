# API authentication & authorization (signed-in users)

How portal users stay secure when calling the Nest API after sign-in.

Related: [onboarding-invite-flow.md](./onboarding-invite-flow.md) · [ADR-0002](./adr/0002-scheduling-workflow-backend-shape.md) · Q1 delivery plan.

---

## Supabase Auth or JWT?

**Both — they are the same thing in this stack.**

| Term | What it means here |
|------|------------------|
| **Supabase Auth** | Product that handles sign-up, sign-in, password reset, sessions |
| **JWT (access token)** | What Supabase **issues** after sign-in — a signed JSON Web Token |
| **Nest “JWT guard”** | Code that **verifies** that Supabase-issued token on each API request |

There is **no separate** Frontera-issued login system planned. Lovable does **not** send username/password to Nest on every API call. It sends:

```http
Authorization: Bearer <supabase_access_token>
```

That string **is** the Supabase session access token (a JWT). Nest validates signature and claims using **JWKS** from `SUPABASE_URL` (recommended) or optionally `SUPABASE_JWT_SECRET` (HS256 legacy).

---

## Request flow (signed in)

```text
Provider / corporate user
  → signs in on Lovable (email + password)
  → Supabase Auth returns access_token (+ refresh_token)

Every API call to Nest:
  Lovable → HTTPS → API Gateway → Lambda (Nest)
    Header: Authorization: Bearer <access_token>
    Nest guard: verify JWT → attach user id + role to request
    Service: business rules + DB queries scoped to that user
```

Password is used **once** at sign-in (to Supabase). All later Nest calls use the **JWT only**.

---

## Two layers of security

### 1. Authentication (who are you?)

**Shipped** — global `SupabaseJwtGuard` on all routes except `@Public()`.

- Reject missing/invalid/expired tokens → `401 Unauthorized`.
- Extract `sub` (user UUID) from JWT → maps to `auth.users.id` / `profiles.user_id`.
- Load `user_roles` from Postgres and attach `request.user` (`id`, `email`, `roles`).

Verify with:

- **JWKS (default)** — set `SUPABASE_URL`; Nest fetches  
  `https://<project>.supabase.co/auth/v1/.well-known/jwks.json`  
  Or set `SUPABASE_JWKS_URL` to override that path.
- **HS256 (optional legacy)** — `SUPABASE_JWT_SECRET` from Supabase dashboard; only needed if tokens are not signed with JWKS keys.

Set `AUTH_DISABLED=true` only for temporary local/Swagger testing without a session.

### 2. Authorization (what may you do?)

JWT proves identity; **roles and assignments** decide permission.

| Source | Use |
|--------|-----|
| `user_roles.role` | `admin`, `internal_staff`, `provider_user`, `client_user` |
| `assignments` / `org_memberships` | Recruiter ↔ provider, client org scope |
| Route prefix | `admin/*` → staff roles only; `provider/*` → `provider_user` (and maybe admin) |

Examples:

- Provider cannot call `POST /admin/scheduling/requests/:id/approve`.
- Recruiter only sees review queue rows for their providers/sites (repository filters + JWT user id).

---

## Nest vs Supabase direct access (Lovable)

Lovable may talk to **two** backends:

| Target | Auth | Enforcement |
|--------|------|-------------|
| **Nest API** | Bearer JWT | Nest guard + service-layer checks (required) |
| **Supabase Postgres** (client SDK) | Same JWT passed to Supabase | **RLS** policies in Postgres |

Nest uses `DATABASE_URL` (pooler / service role) and often **bypasses RLS**. So Nest must **not** trust “any valid JWT” alone for row access — it must **enforce roles and scoping in code** (repositories/services), even when the token is valid.

RLS still matters for anything the FE reads/writes **directly** against Supabase.

---

## What is secure today

| Item | Status |
|------|--------|
| Global `SupabaseJwtGuard` | **Shipped** — all routes except `@Public()` |
| `RolesGuard` + `@Roles()` | **Shipped** on `admin/*`, `provider/*`, `client/*`, announcements |
| `ProviderSelfGuard` | **Shipped** — providers may only access their own `providerId` (admins override) |
| Public routes | `GET /health`, `GET/POST /accept-invite` |
| Onboarding invite / accept | Token-based HTML flow (no JWT until user signs in) |

Until `SUPABASE_URL` (or `SUPABASE_JWKS_URL`) is configured, auth is only enforced when `NODE_ENV=production` (Lambda). Locally, set `SUPABASE_URL` or use `AUTH_DISABLED=true` for open routes.

---

## FE responsibilities (Lovable)

1. On sign-in: use Supabase client `signInWithPassword` (or SSO later).
2. Store session; attach `Authorization: Bearer <access_token>` to **every** Nest `fetch`.
3. Refresh session when expired (`refreshSession`) before retrying Nest calls.
4. On `401` from Nest: redirect to login.
5. Never send password to Nest API routes.

---

## Env vars

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | **Required for JWT auth** — project URL; JWKS URL derived automatically |
| `SUPABASE_JWKS_URL` | Optional override if JWKS is not at the default path under `SUPABASE_URL` |
| `SUPABASE_JWT_SECRET` | Optional HS256 fallback (legacy); not needed when using JWKS |
| `AUTH_DISABLED` | Set `true` to bypass guards (local debugging only; default `false` on Lambda) |
| `DATABASE_URL` | Nest DB connection (separate from user JWT) |

---

## Route coverage

| Prefix | Roles | Notes |
|--------|-------|-------|
| `GET /health` | Public | Load balancer / smoke test |
| `accept-invite` | Public | HTML onboarding form |
| `admin/*` | `admin`, `internal_staff` | Corporate portal |
| `provider/:providerId/*` | `provider_user`, `admin` | `ProviderSelfGuard` scopes provider id |
| `client/*` | `client_user`, `admin`, `internal_staff` | Client portal |
| `announcements/inbox` | All portal roles | Scoped to signed-in user |
| `holidays` | All portal roles | `admin`, `internal_staff`, `provider_user`, `client_user` |
