# Plan 011: Design spike — one Drizzle schema for two apps sharing one database

> **Executor instructions**: This is an INVESTIGATION plan. The deliverable is a
> written report (`plans/011-report.md`), NOT code changes. You may create
> throwaway branches/worktrees to test build feasibility, but nothing lands in
> `dev`. If anything in the "STOP conditions" section occurs, stop and report.
> When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ca8b8b1f..HEAD -- src/lib/db/schema.ts saas-admin/src/lib/db/schema.ts`
> Re-run the table-inventory diff in Step 1 regardless — it is the spike's input.

## Status

- **Priority**: P3
- **Effort**: M (spike itself; the migration it designs is L)
- **Risk**: n/a (read-only spike)
- **Depends on**: none
- **Category**: tech-debt / migration design
- **Planned at**: commit `ca8b8b1f`, 2026-07-02

## Why this matters

Two hand-maintained Drizzle schemas point at the **same Neon database**:

- `src/lib/db/schema.ts` — 786 lines, 32 `pgTable` definitions
- `saas-admin/src/lib/db/schema.ts` — 649 lines, 27 `pgTable` definitions — a manually-mirrored subset missing (at `ca8b8b1f`): `assistantThreads`, `assistantMessages`, `reviewComparisonReports`, `reviewComparisonReportBusinesses`, `reviewAnalysisReports`, and drifting in enum inventories

Both apps also duplicate the db client (`src/lib/db/client.ts` vs `saas-admin/src/lib/db/client.ts`, near-identical `drizzle(env.DATABASE_URL, { schema })`) and better-auth table definitions. Every column change in the main app must be hand-copied into the admin app or the admin reads/writes the shared DB with a stale model — a silent-runtime-bug class (the admin's baseline migration even still contains Geidea columns). Additionally **both apps run drizzle-kit against the same database** (`db:generate`/`db:push` scripts exist in both `package.json`s), so two migration histories govern one schema — the drift mechanism is structural, not accidental.

This spike produces a decision-ready design, not the migration itself.

## Current state

- Main app: repo root is itself the Next.js app (`package.json`, `src/`); `tsconfig.json` maps `@/* → ./src/*` and **excludes `saas-admin`**.
- Admin app: `saas-admin/` is a self-contained Next.js app with its own `package.json`, `package-lock.json`, `tsconfig.json`, `drizzle/` migrations, deployed separately (Coolify; `git log` commit `81624948` "Fix saas-admin to respect PORT env var from Coolify").
- There is no npm workspace setup; the two lockfiles are independent.
- Drizzle version pins are identical today (`^0.45.1` both; plan 002 bumps both).

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Table inventory (main) | `grep -c "pgTable(" src/lib/db/schema.ts` | 32 at `ca8b8b1f` |
| Table inventory (admin) | `grep -c "pgTable(" saas-admin/src/lib/db/schema.ts` | 27 at `ca8b8b1f` |
| Feasibility builds | `npm run typecheck` in each app on your throwaway branch | exit 0 |

## Scope

**In scope (deliverable)**: `plans/011-report.md` containing the sections listed in Steps 1–4.

**Out of scope**: ANY change to `dev` — no schema moves, no package.json restructuring, no lockfile changes outside throwaway branches.

## Steps

### Step 1: Quantify the drift precisely

Diff the two schemas table-by-table (tables present in one but not the other; per-shared-table column/enum/index differences; better-auth table definition differences). Also diff the two `drizzle/` migration histories' end-states. Record: which app has ever *written* columns the other can't see (search both codebases for usages of the divergent tables/columns).

### Step 2: Evaluate exactly three options

For each: build feasibility (prove with a throwaway branch that `npm run typecheck` passes in BOTH apps), deploy impact (Vercel root build + Coolify subdir build), migration-history impact (who runs drizzle-kit afterwards), and day-2 ergonomics (what a schema change looks like).

- **A. npm workspaces + `packages/db`** — hoist a shared package consumed by both apps. Assess: converting the repo root (which IS the main app) into a workspace root; both deploy targets must install workspace deps; lockfile unification.
- **B. Shared source without a package** — the admin's tsconfig maps `@shared-db/*` to `../src/lib/db/*` (or a top-level `shared/db/` folder both alias). No package manager changes. Assess: whether `next build` in `saas-admin/` compiles files outside its root (Next supports `transpilePackages`/`externalDir`; verify concretely), and whether Coolify's build context includes the parent directory.
- **C. Generated mirror** — a script (`scripts/sync-admin-schema.ts`) that copies/derives the admin schema from the main one, run in CI with a drift check that fails the build when out of sync. Lowest structural change, weakest guarantee. Assess what the CI check looks like (plan 010's workflow is the host).

### Step 3: Decide the drizzle-kit ownership rule

Whatever the option, the report must name **one** owner of migrations (recommendation to evaluate first: main app owns `drizzle/` + `db:generate`/`db:push`; the admin app's drizzle-kit scripts are deleted and it becomes a schema *consumer*). Document how the admin's existing `saas-admin/drizzle/` history is retired safely (its journal vs the shared DB's `__drizzle_migrations` table — inspect which table names each app's kit config uses; check `drizzle.config.ts` in both).

### Step 4: Write the recommendation

`plans/011-report.md`: chosen option with rationale, rejected options with one-line reasons, a step-by-step migration outline (each step keeping both apps deployable), estimated blast radius (files touched per app), risks (top 3), and the rollback story. End with a "ready to become plan 012" checklist.

## Test plan

n/a (spike). The feasibility branches' `typecheck` results are the evidence; cite them (branch name + command + result) in the report.

## Done criteria

- [ ] `plans/011-report.md` exists with: drift inventory, three options assessed with build-feasibility evidence, migration-ownership rule, recommendation + outline
- [ ] No changes on `dev` (`git status` clean; throwaway branches clearly named `spike/011-*`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- You discover the admin app *writes* to a table whose definition diverges from the main app's (not just reads) — that's an active-corruption risk; report immediately as a priority finding, don't wait for the full report.
- Either app's build cannot pass on ANY option's throwaway branch — report the blocking constraint.

## Maintenance notes

- Plan 002 (dependency bumps) should land before the feasibility branches so you're testing against the patched drizzle-orm.
- The auth-table duplication (better-auth config in both apps) rides along with whichever option wins; note it in the report but don't expand scope.
