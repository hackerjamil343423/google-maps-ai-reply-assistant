# Plan 010: Fix the actively-wrong docs, add a fast typecheck, and stand up minimal CI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ca8b8b1f..HEAD -- README.md docs/PROJECT.md CLAUDE.md package.json saas-admin/package.json`
> If `docs/PROJECT.md` or `CLAUDE.md` were already corrected, skip the
> corresponding steps rather than re-editing.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/005-vitest-baseline.md for the CI test step (make that step conditional if 005 hasn't landed)
- **Category**: docs / dx
- **Planned at**: commit `ca8b8b1f`, 2026-07-02

## Why this matters

The repo's primary human-facing docs are actively wrong, which is worse than missing:

- `docs/PROJECT.md` names the dead brand ("Five Star Reply"), lists prices that are wrong in **both currency and amount** (USD $15/$49/$199 vs the real SAR 149/349/999 in `src/lib/subscription/plans.ts:12-41`), and says Stripe billing is "Pending" though it is live (`src/app/api/subscription/webhook/route.ts`, commit `149125b1`). Quoting a customer from this doc would misprice by ~10×.
- `CLAUDE.md` contradicts itself: line 32 says "**Five Star Reply** is a SaaS…", line 147 says "Product is **Wakkelni Stars** (not 'Five Star Reply')" — agents generating user-facing copy can pick the dead name.
- `README.md` is untouched create-next-app boilerplate — no mention of Neon, Drizzle, env setup, `db:push`, Stripe bootstrap, cron, or the second app in `saas-admin/`. A human contributor cannot bring the app up from it.

DX: `"typecheck": "next build"` in both apps means the tightest feedback loop is a full production build (minutes, and it fails on non-type issues); there is no CI at all (no `.github/workflows/`), so lint/types/tests only run when someone remembers.

## Current state

- `README.md` — verbatim Next.js starter (verified: "bootstrapped with create-next-app", Geist font blurb, Vercel deploy section).
- `docs/PROJECT.md` — stale facts at line 1 (title), lines 60–77 ("Backend Implementation Status… Pending: Stripe checkout + live webhook billing flow"), lines 136–141 (Business Model table: $15/$49/$199).
- `CLAUDE.md:32` vs `CLAUDE.md:147` — the naming contradiction. CLAUDE.md is otherwise accurate and is the best source to distill the README from (commands, structure, patterns).
- Ground truth for prices: `src/lib/subscription/plans.ts:12-41` — `PLAN_LIMITS`: free (0), "Local Business" 149/mo (yearly 1430, maxAccounts 1), "Multi-Location" 349/mo (yearly 3350, maxAccounts 5), "Agency Max" 999/mo (yearly 9590, maxAccounts 60). Currency is SAR (KSA market). Prices are also runtime-overridable via `platformSettings` (`src/lib/subscription/pricing.ts`) — the doc should state plans.ts + admin overrides as the source of truth rather than hardcoding numbers a second time.
- `package.json:10` and `saas-admin/package.json` — `"typecheck": "next build"`. TypeScript ~5 is a devDep in both; root `tsconfig.json` already has `noEmit: true` and excludes `saas-admin`.
- No `.github/` directory exists.
- Env vars actually read by the main app (from `src/lib/env.ts`): `DATABASE_URL, BETTER_AUTH_URL, BETTER_AUTH_SECRET, NEXT_PUBLIC_APP_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_MAPS_API_KEY, OPENAI_API_KEY, OPENAI_MODEL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, MINIMAX_API_KEY, CRON_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL`.

## Commands you will need

| Purpose   | Command                        | Expected on success |
|-----------|--------------------------------|---------------------|
| Fast typecheck (new) | `npm run typecheck`  | exit 0 in seconds   |
| Full build | `npm run build`               | exit 0              |
| Lint      | `npm run lint`                 | exit 0              |
| Tests     | `npm test` (if plan 005 landed)| all pass            |

## Scope

**In scope**:
- `README.md` (rewrite)
- `docs/PROJECT.md` (correct the stale facts)
- `CLAUDE.md` (fix line 32; update the typecheck description if scripts change)
- `package.json`, `saas-admin/package.json` (scripts only)
- `.github/workflows/ci.yml` (create)

**Out of scope**:
- All other docs in `docs/` (Geidea banners are plan 009).
- Any source code.
- Branch protection / repo settings (mention in the report that the operator can require the new check).

## Git workflow

- Branch: `advisor/010-docs-dx` off `dev`
- Commit per step; short imperative sentences.
- Do NOT push or open a PR unless instructed (CI proves itself on the first push — note that in the report).

## Steps

### Step 1: Fast typecheck scripts

In both `package.json` files: set `"typecheck": "tsc --noEmit"` and add `"build": "next build"` retention as-is (already present). In `CLAUDE.md`, update the Quick Start line `npm run typecheck  # TypeScript type checking (runs next build)` to reflect `tsc --noEmit`, and keep a note that `npm run build` remains the pre-deploy gate.

Caveat: `tsconfig.json` includes `.next/types/**/*.ts`; on a machine that has never built, those globs match nothing (fine). If `tsc --noEmit` errors on missing Next-generated types, run `npm run dev` once briefly or `next build` to generate them — if errors persist, STOP and report rather than loosening tsconfig.

**Verify**: `npm run typecheck` → exit 0 (both apps), measurably faster than `next build`.

### Step 2: Rewrite README.md

Replace the boilerplate with (distill from `CLAUDE.md`, which is verified-accurate except line 32):

1. What this is: **Wakkelni Stars** — AI-powered Google Business Profile review management SaaS (KSA market); two apps: this root Next.js app + `saas-admin/` (platform admin panel, own package.json, port 3001).
2. Prerequisites: Node 20+, a Neon Postgres URL, and the env vars — point to `.env.example` (complete after plan 001).
3. Setup: `npm install` → copy `.env.example` to `.env` and fill → `npm run db:push` → `npm run dev`.
4. Stripe: prices bootstrapped once via `scripts/stripe-bootstrap.ts`; local webhooks via `stripe listen --forward-to localhost:3000/api/subscription/webhook`.
5. Background jobs: cron endpoints under `/api/cron/*` authorized with `Bearer $CRON_SECRET` (required).
6. Commands table: dev/build/start/lint/typecheck/test/db:\*.
7. Pointer to `CLAUDE.md` for architecture detail and `plans/README.md` for the improvement backlog.

**Verify**: `grep -ci "create-next-app\|Geist" README.md` → 0; README mentions `saas-admin`, `db:push`, and `CRON_SECRET`.

### Step 3: Correct PROJECT.md and CLAUDE.md

- `docs/PROJECT.md`: retitle to "Wakkelni Stars (formerly Five Star Reply)"; in the status section move "Stripe checkout + live webhook billing flow" from Pending to Completed (with the caveat that plan 006 hardening may be in flight); replace the Business Model price table with a pointer: "Pricing source of truth: `src/lib/subscription/plans.ts` (defaults) + `platformSettings` overrides via saas-admin. As of 2026-07: SAR 149 / 349 / 999 per month."
- `CLAUDE.md:32`: change "**Five Star Reply** is a SaaS…" to "**Wakkelni Stars** (formerly Five Star Reply) is a SaaS…"; the later note at line 147 can stay.

**Verify**: `grep -n "Five Star Reply" docs/PROJECT.md CLAUDE.md` → only in "formerly Five Star Reply" phrasings; `grep -n '\$15\|\$49\|\$199' docs/PROJECT.md` → no matches.

### Step 4: Minimal CI

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main, dev]
  pull_request:

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test --if-present
      - run: npm audit --omit=dev --audit-level=high
```

Notes baked into the design: `npm test --if-present` keeps CI green before plan 005 lands; the audit step enforces plan 002's outcome (fails on new HIGH advisories); no env vars are needed because lint/tsc don't require them (the `NEXT_PHASE` guard from plan 001 only affects `next build`, which CI deliberately does not run — building both Next apps in CI is a follow-up once build-time env strategy is decided).

**Verify**: YAML is valid: `npx --yes yaml-lint .github/workflows/ci.yml` exits 0 (or use `node -e "require('js-yaml')..."` — any local YAML validation); the five run steps match the table in "Commands you will need".

## Test plan

Docs-only + scripts + CI config; verification is the greps and command runs above. The CI workflow's real test is the first push — state that in the completion report.

## Done criteria

- [ ] `npm run typecheck` = `tsc --noEmit` in both apps and exits 0
- [ ] README describes the real setup (greps in Step 2 pass)
- [ ] PROJECT.md and CLAUDE.md contain no un-qualified "Five Star Reply" and no USD prices
- [ ] `.github/workflows/ci.yml` exists and is valid YAML
- [ ] `npm run lint` + `npm run build` still exit 0 (build must not have been broken by script edits)
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- `tsc --noEmit` produces type errors that `next build` does not (differing type resolution) — report the errors; do not add `skipLibCheck`-style suppressions beyond what tsconfig already has.
- You find other price lists in docs/marketing pages contradicting `plans.ts` — fixing marketing copy (`src/app/pricing/page.tsx` etc.) is out of scope; list them in the report.

## Maintenance notes

- Once CI is green on a few PRs, the operator should make the `checks` job required on `main` and `dev`.
- When plan 005 lands, remove `--if-present` so a missing test script fails loudly.
- `docs/PROJECT.md` now points at `plans.ts` for prices — future price changes need no doc edit; that's deliberate.
