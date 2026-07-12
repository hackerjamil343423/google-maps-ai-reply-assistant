# Plan 001: Make auth and cron secrets fail closed in production

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ca8b8b1f..HEAD -- src/lib/auth.ts src/lib/env.ts src/app/api/cron .env.example saas-admin/src/lib/auth/admin-auth.ts saas-admin/src/lib/env.ts saas-admin/.env.example`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `ca8b8b1f`, 2026-07-02

## Why this matters

Both Next.js apps in this repo sign auth sessions with a **hardcoded fallback secret that is committed to the repository** whenever the corresponding env var is unset. Anyone who can read the source can forge session cookies if a production deployment ever runs without the env var — full account takeover on the main app, admin-panel bypass on saas-admin. Separately, all four cron endpoints skip their auth check entirely when `CRON_SECRET` is unset, letting anonymous callers trigger Google reply-posting, OpenAI spend, subscription-expiry transitions, and email sends. Nothing warns when these vars are missing, and the root `.env.example` doesn't even list `CRON_SECRET`, so a fresh deployment gets the insecure configuration by default.

## Current state

Relevant files:

- `src/lib/auth.ts` — main-app better-auth config; contains the fallback secret (lines 10–11, 37)
- `saas-admin/src/lib/auth/admin-auth.ts` — admin-app better-auth config; same pattern (lines 9, 23)
- `src/lib/env.ts` — Zod env validation; every secret is `.optional()` (lines 21–28, 37, 46); exports `isProduction` (line 70)
- `saas-admin/src/lib/env.ts` — admin env validation; `ADMIN_BETTER_AUTH_SECRET` optional with `min(8)`; exports `isProduction`
- `src/app/api/cron/process-jobs/route.ts`, `src/app/api/cron/schedule-syncs/route.ts`, `src/app/api/cron/subscription-expiry/route.ts`, `src/app/api/cron/trial-expiry/route.ts` — all four use the same fail-open guard
- `.env.example` — missing `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (all three are read by `src/lib/env.ts:46-48`)

Excerpts as of `ca8b8b1f`:

```ts
// src/lib/auth.ts:10-11
const DEV_AUTH_SECRET =
  "dev-only-secret-change-before-production-1234567890";
// src/lib/auth.ts:37
  secret: env.BETTER_AUTH_SECRET ?? DEV_AUTH_SECRET,
```

```ts
// saas-admin/src/lib/auth/admin-auth.ts:9
const DEV_SECRET = "admin-dev-secret-change-in-production-9876543210";
// saas-admin/src/lib/auth/admin-auth.ts:23
  secret: env.ADMIN_BETTER_AUTH_SECRET ?? DEV_SECRET,
```

```ts
// src/app/api/cron/process-jobs/route.ts:11-14 (same shape in all four cron routes)
  const authHeader = req.headers.get("authorization");
  if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
```

When `env.CRON_SECRET` is `undefined`, the `&&` short-circuits and the request is allowed.

Convention note: API routes in this repo return errors as `NextResponse.json({ error: "..." }, { status: N })` — keep that shape. The Stripe webhook already demonstrates the fail-closed convention this plan extends to cron: `src/app/api/subscription/webhook/route.ts:191-194` returns 500 when `STRIPE_WEBHOOK_SECRET` is unset.

**Build-time caveat you must handle**: `next build` runs with `NODE_ENV=production` and imports route modules. A module-level `throw` on missing secrets would break `npm run build` on machines without a populated `.env`. Next.js sets `process.env.NEXT_PHASE === "phase-production-build"` during the build — use it to skip the hard failure at build time only.

## Commands you will need

| Purpose   | Command                                | Expected on success |
|-----------|----------------------------------------|---------------------|
| Lint      | `npm run lint` (repo root)             | exit 0              |
| Typecheck/build | `npm run typecheck` (repo root; this runs `next build`) | exit 0 |
| Admin lint | `cd saas-admin && npm run lint`       | exit 0              |
| Admin build | `cd saas-admin && npm run typecheck` | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/lib/auth.ts`
- `src/lib/env.ts`
- `src/app/api/cron/process-jobs/route.ts`
- `src/app/api/cron/schedule-syncs/route.ts`
- `src/app/api/cron/subscription-expiry/route.ts`
- `src/app/api/cron/trial-expiry/route.ts`
- `.env.example`
- `saas-admin/src/lib/auth/admin-auth.ts`
- `saas-admin/src/lib/env.ts`
- `saas-admin/.env.example`

**Out of scope** (do NOT touch):
- `src/app/api/subscription/webhook/route.ts` — its secret handling is already fail-closed.
- better-auth session/cookie options, sign-in flows, or any other auth behavior.
- `vercel.json` / deployment configuration.

## Git workflow

- Branch: `advisor/001-fail-closed-secrets` off `dev`
- Commit style: short imperative sentence, no prefix (matches `git log`, e.g. "Fix explicit workspace onboarding flow")
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Fail closed in the four cron routes

In each of the four cron route files, replace the guard with a fail-closed version:

```ts
  const authHeader = req.headers.get("authorization");
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
```

Also update the doc comments in `subscription-expiry/route.ts` and `trial-expiry/route.ts` that currently say `(skipped when CRON_SECRET is unset)` — change to `(required; requests are rejected when CRON_SECRET is unset)`.

**Verify**: `grep -rn "env.CRON_SECRET &&" src/app/api/cron/` → no matches. `grep -rln "!env.CRON_SECRET ||" src/app/api/cron/` → lists all four route files.

### Step 2: Hard-fail on missing auth secret at production runtime (main app)

In `src/lib/auth.ts`, replace the fallback line with a guarded resolution. Target shape:

```ts
const isProductionRuntime =
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build";

if (isProductionRuntime && !env.BETTER_AUTH_SECRET) {
  throw new Error(
    "BETTER_AUTH_SECRET must be set in production. Refusing to start with the dev fallback secret."
  );
}
```

and use `secret: env.BETTER_AUTH_SECRET ?? DEV_AUTH_SECRET` unchanged below it (the throw above guarantees the fallback is only reachable in dev/build). Keep `DEV_AUTH_SECRET` for local development.

**Verify**: `npm run typecheck` → exit 0 (build must still pass — the `NEXT_PHASE` guard is what makes this true even if your shell has no `.env`; note `npm run typecheck` loads `.env` via Next, so also confirm the guard reads exactly `process.env.NEXT_PHASE !== "phase-production-build"`).

### Step 3: Same hard-fail in saas-admin

Apply the identical pattern in `saas-admin/src/lib/auth/admin-auth.ts` for `env.ADMIN_BETTER_AUTH_SECRET` / `DEV_SECRET`.

Additionally, in `saas-admin/src/lib/env.ts`, change the `optionalSecretString` minimum from `min(8)` to `min(32)` so the admin secret has the same strength requirement as the main app (`src/lib/env.ts:27` uses `min(32)`).

**Verify**: `cd saas-admin && npm run typecheck` → exit 0.

### Step 4: Complete `.env.example` files

Append to the root `.env.example`:

```
# Cron endpoint auth — REQUIRED in production; cron requests are rejected without it.
# Generate: openssl rand -hex 32
CRON_SECRET=

# Resend (transactional email: welcome, trial expiry, renewal failure, invitations)
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

`saas-admin/.env.example` already lists its vars; update the `ADMIN_BETTER_AUTH_SECRET` comment from "min 8 characters" to "min 32 characters".

**Verify**: `grep -c "CRON_SECRET\|RESEND_API_KEY\|RESEND_FROM_EMAIL" .env.example` → `3` (or more).

### Step 5: Full verification pass

**Verify**: `npm run lint` → exit 0; `npm run typecheck` → exit 0; `cd saas-admin && npm run lint && npm run typecheck` → exit 0.

## Test plan

No test framework exists yet at this plan's position in the execution order (it is introduced in plan 005). Verification is via the greps and builds above. After plan 005 lands, a follow-up test should assert the cron guard returns 401 when `CRON_SECRET` is undefined — note this in your completion report.

## Done criteria

- [ ] `grep -rn "env.CRON_SECRET &&" src/app/api/cron/` → no matches
- [ ] All four cron routes return 401 when `CRON_SECRET` is unset (code-inspection: `!env.CRON_SECRET ||` present in each)
- [ ] `src/lib/auth.ts` and `saas-admin/src/lib/auth/admin-auth.ts` both throw at production runtime when their secret env var is missing
- [ ] Root `.env.example` lists `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- [ ] `npm run lint`, `npm run typecheck` (both apps) exit 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- `npm run typecheck` fails after Step 2 in a way that implicates the module-level throw (i.e. the `NEXT_PHASE` guard does not prevent build-time evaluation) — do not weaken the check to make the build pass; report instead.
- You find any *other* hardcoded secret fallback while editing (search hits beyond the two named constants).

## Maintenance notes

- **Operator action required after merge (put this in your completion report):** the two fallback secret strings are burned — they are in git history. If any production deployment ever ran without `BETTER_AUTH_SECRET` / `ADMIN_BETTER_AUTH_SECRET` set, those secrets must be rotated and all sessions invalidated. Verify `CRON_SECRET`, `BETTER_AUTH_SECRET`, and `ADMIN_BETTER_AUTH_SECRET` are set in every deployment environment (Vercel project settings; Coolify for saas-admin) **before** deploying this change — after it, missing vars mean hard 401s/startup failure instead of silent insecurity.
- The cron guard's plain string compare is not constant-time; acceptable for a long random bearer token, but if the team wants strict equality-timing hygiene, a follow-up can switch to `crypto.timingSafeEqual`.
- Plan 010 adds CI; the CI build must set dummy env vars or rely on the `NEXT_PHASE` guard (it does, by design).
