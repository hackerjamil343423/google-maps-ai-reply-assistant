# Plan 005: Stand up a vitest verification baseline and cover the pure money-path modules

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ca8b8b1f..HEAD -- package.json src/lib/subscription src/lib/jobs/queue.ts src/lib/business-access.ts tsconfig.json`
> On drift in the modules under test, re-read them before writing assertions;
> the test *targets* drifting is expected and fine — the test *infrastructure*
> steps below are unaffected.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (purely additive — no runtime code changes except one optional export)
- **Depends on**: none. Plans 006 and 008 depend on THIS.
- **Category**: tests
- **Planned at**: commit `ca8b8b1f`, 2026-07-02

## Why this matters

The repo has **zero test files and no test framework** in either app; the only automated gate is ESLint plus `next build`. Meanwhile the highest-churn files in the last 50 commits are the money paths: `src/app/api/subscription/checkout/route.ts` (11 touches), `src/lib/db/schema.ts` (11), `src/app/api/subscription/webhook/route.ts` (10) — all shipped on manual testing alone. Several sibling plans (billing correctness, reviews-endpoint refactor) are risky without a safety net. This plan creates the one-command verification baseline (`npm test`) and proves the harness on the modules that need no mocking, plus one mocked-DB exemplar future tests can copy.

## Current state

- `package.json` (root) — scripts at lines 5–14: `dev`, `build`, `start`, `lint`, `typecheck` (= `next build`), `db:*`. No `test` script; no test framework in devDependencies (lines 31–41).
- `tsconfig.json` — path alias `"@/*": ["./src/*"]`; `moduleResolution: "bundler"`; `saas-admin` is excluded.
- Test-target modules (all read and verified at `ca8b8b1f`):
  - `src/lib/subscription/plans.ts` — `PLAN_LIMITS` (line 12: free/Local Business 149/Multi-Location 349/Agency Max 999, `maxAccounts` 1/1/5/60), `isKnownPlan` (line 45). Pure.
  - `src/lib/subscription/pricing.ts` — `normalizePlanPrices` (line 50), `buildPlanCatalog` (line 70), `DEFAULT_PLAN_PRICES` (line 31), `PAID_PLAN_NAMES` (line 16). The module also exports async DB-backed functions (`getEffectivePlanCatalog` etc.) — importing the module is safe without a DB (`@/lib/db` resolves `db` to `null` when `DATABASE_URL` is unset), but only test the pure functions.
  - `src/lib/jobs/queue.ts:76-79` — `computeBackoff(attempts)`: `30_000 * 4^(attempts-1)` capped at 8 minutes. Pure. Module imports `@/lib/db` — same note as above.
  - `src/lib/business-access.ts` — `getAccessibleBusinessIds` (line 58: returns all workspace business ids for `accessMode "all"`, intersection for `"selected"`, `[]` when no membership), `userCanAccessBusinesses` (line 84: `false` on empty input, set-based `every`), `validateBusinessIdsForWorkspace` (line 189: throws `"One or more selected profiles do not belong to this workspace."` when any id is foreign). DB-backed via `@/lib/db` — this is the mocked-DB exemplar.
- `src/lib/env.ts` parses `process.env` at import with all vars optional → importing app modules in a test process with no env vars works.

## Commands you will need

| Purpose   | Command                     | Expected on success |
|-----------|------------------------------|---------------------|
| Install   | `npm install -D vitest`      | exit 0              |
| Tests     | `npm test`                   | all pass            |
| Lint      | `npm run lint`               | exit 0              |
| Build     | `npm run typecheck`          | exit 0              |

## Scope

**In scope**:
- `package.json` (add devDep `vitest`, add `"test": "vitest run"` and `"test:watch": "vitest"` scripts)
- `vitest.config.ts` (create, repo root)
- `src/lib/subscription/__tests__/plans.test.ts` (create)
- `src/lib/subscription/__tests__/pricing.test.ts` (create)
- `src/lib/jobs/__tests__/queue.test.ts` (create)
- `src/lib/business-access.test.ts` or `src/lib/__tests__/business-access.test.ts` (create)

**Out of scope**:
- Any change to runtime source code. (If a target function is not exported, STOP — all listed ones are exported at `ca8b8b1f`.)
- `saas-admin/` — its baseline can copy this later.
- CI wiring (plan 010).
- React component / route-handler testing (no jsdom, no `next` test harness) — this baseline is node-environment unit tests only.

## Git workflow

- Branch: `advisor/005-vitest-baseline` off `dev`
- Commits: one for harness, one for tests; short imperative sentences.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Install and configure vitest

`npm install -D vitest`. Create `vitest.config.ts` at repo root:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

**Verify**: `npm test` → exits 0 with "no test files found" (or equivalent) — the harness runs.

### Step 2: Pure-function tests

Write the three pure suites. Required cases (assert against the excerpted facts, re-read the source first):

`src/lib/subscription/__tests__/plans.test.ts`
- `isKnownPlan` true for all four plan names, false for `""`, `"Free"`, `"local business"`.
- `PLAN_LIMITS` invariants: every entry has `maxAccounts >= 1`; `free.monthlyPrice === 0`; paid plans have `monthlyPrice > 0` and `yearlyPrice > 0`.

`src/lib/subscription/__tests__/pricing.test.ts`
- `normalizePlanPrices(null)` / `(undefined)` / `("junk")` → `null`.
- `normalizePlanPrices(validMapMatchingDEFAULT_PLAN_PRICES)` → returns the map (read lines 50–68 for the exact accepted shape — write the fixture from the source, not from this plan).
- `buildPlanCatalog(DEFAULT_PLAN_PRICES)` → returns an entry per plan in `PLAN_LIMITS`, each with the prices from the input map.

`src/lib/jobs/__tests__/queue.test.ts`
- `computeBackoff(1)` → ~30s from now; `computeBackoff(2)` → ~2min; `computeBackoff(3)` → ~8min; `computeBackoff(10)` → capped at 8min. Compare `result.getTime() - Date.now()` within a ±1s tolerance.

**Verify**: `npm test` → all pass, ≥ 10 assertions total.

### Step 3: Mocked-DB exemplar for tenancy logic

Create the `business-access` suite using `vi.mock("@/lib/db", ...)`. Pattern:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirstMember: vi.fn(),
  findManyAssignments: vi.fn(),
  findManyBusinesses: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      workspaceMembers: { findFirst: mocks.findFirstMember },
      workspaceMemberBusinessAssignments: { findMany: mocks.findManyAssignments },
      businesses: { findMany: mocks.findManyBusinesses },
    },
  },
}));
```

Before writing this, open `src/lib/business-access.ts` and confirm which `db.query.*` accessors each function uses (at `ca8b8b1f`: `getWorkspaceBusinesses` → `businesses.findMany`; `getWorkspaceMemberAccess` → `workspaceMembers.findFirst` + `workspaceMemberBusinessAssignments.findMany`; `validateBusinessIdsForWorkspace` → `businesses.findMany`). Required cases:

- no membership → `getAccessibleBusinessIds` returns `[]`
- `accessAllBusinesses: true` → returns all workspace business ids
- selected mode → returns only the intersection of assignments and workspace businesses (a foreign assignment id must not leak through)
- `userCanAccessBusinesses(..., [])` → `false`
- `validateBusinessIdsForWorkspace` with one foreign id → throws; with all-owned ids → returns the deduped ids

**Verify**: `npm test` → all pass including the new suite.

### Step 4: Keep lint/build green

ESLint config is `eslint.config.mjs` (flat config, eslint-config-next). Test files may trigger rules the app code doesn't; if so, add an override block for `**/*.test.ts` in `eslint.config.mjs` (this file is then in scope) rather than sprinkling disable comments.

**Verify**: `npm run lint` → exit 0; `npm run typecheck` → exit 0 (Next must not try to build test files — it won't; they're not under `app/` — but confirm).

## Test plan

This plan IS the test plan. Final state: `npm test` runs 4 suites, all green, in under ~10 seconds.

## Done criteria

- [ ] `npm test` exits 0 with 4 test files passing
- [ ] `vitest.config.ts` resolves the `@/` alias (proven by the suites importing via `@/lib/...`)
- [ ] The mocked-DB exemplar exists and demonstrates `vi.mock("@/lib/db")`
- [ ] `npm run lint` and `npm run typecheck` still exit 0
- [ ] No runtime source file modified (`git status` shows only the in-scope list)
- [ ] `plans/README.md` status row updated

## STOP conditions

- A listed target function is not exported or its signature differs from the excerpts (drift).
- Importing a target module in the test process throws at import time (e.g. an env parse changed to be strict) — report which module and the error; do not weaken `src/lib/env.ts`.
- vitest cannot resolve `@/` after config — report the config attempted; do not convert imports to relative paths in source.

## Maintenance notes

- This baseline is the dependency for plan 006 (billing tests) and plan 008 (perf refactor). Executors of those plans should model their mocks on the business-access suite.
- When CI lands (plan 010), `npm test` joins lint + typecheck as a required check.
- Deliberately deferred: integration tests against a real Postgres (the `FOR UPDATE SKIP LOCKED` claim in `queue.ts` can only be truly tested that way), route-handler tests, and any `saas-admin` tests.
