# Plan 002: Patch known-vulnerable dependencies in both apps

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ca8b8b1f..HEAD -- package.json package-lock.json saas-admin/package.json saas-admin/package-lock.json`
> If the manifests changed since this plan was written, re-run `npm audit --omit=dev`
> first — some advisories may already be resolved; skip any step whose advisory
> no longer appears.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (patch/minor bumps) — MED only if the Next.js bump is taken
- **Depends on**: none
- **Category**: security / dependencies
- **Planned at**: commit `ca8b8b1f`, 2026-07-02

## Why this matters

`npm audit --omit=dev` at the planning commit reports **13 vulnerabilities (9 moderate, 4 high)** in the main app, all on reachable runtime paths, and the same core pins exist in `saas-admin`. The notable ones:

- `drizzle-orm <0.45.2` — **HIGH** — SQL injection via improperly escaped SQL identifiers (GHSA-gpj5-g38j-94v9). Both apps pin `^0.45.1` and the lockfile resolves the vulnerable version. Drizzle runs every DB query in both apps.
- `next 16.1.6` — **HIGH** range — multiple advisories including HTTP request smuggling in rewrites (GHSA-ggv3-7p47-pfv8) and null-origin Server Actions CSRF bypass (GHSA-mq59-m269-xvcx).
- `better-auth` — moderate — OAuth callback accepts mismatched `state` under some configs (GHSA-wxw3-q3m9-c3jr); it is the live auth path.
- `defu <=6.1.4` — HIGH — prototype pollution (transitive); `kysely` — HIGH (transitive); `uuid` via `svix`/`resend` — moderate (transitive).

These are all fixable with `npm audit fix`-level bumps except possibly Next.js.

## Current state

- `package.json:17-29` (root): `"drizzle-orm": "^0.45.1"`, `"next": "16.1.6"`, `"better-auth": "^1.4.19"`, `"stripe": "^22.2.0"`, `"resend": "^6.11.0"`
- `saas-admin/package.json`: `"drizzle-orm": "^0.45.1"`, `"next": "16.1.6"`, `"better-auth": "^1.4.19"`
- Both apps have their own `package-lock.json`.
- There are **no tests** in the repo at this point; verification is lint + `next build` + a manual smoke of auth and one DB-backed page.

## Commands you will need

| Purpose   | Command                                  | Expected on success |
|-----------|-------------------------------------------|---------------------|
| Audit     | `npm audit --omit=dev`                    | see per-step targets |
| Fix       | `npm audit fix`                           | exit 0              |
| Lint      | `npm run lint`                            | exit 0              |
| Build     | `npm run typecheck` (runs `next build`)   | exit 0              |
| Dev smoke | `npm run dev` then load http://localhost:3000/GetStarted | login page renders |

## Scope

**In scope**:
- `package.json`, `package-lock.json` (root)
- `saas-admin/package.json`, `saas-admin/package-lock.json`

**Out of scope**:
- Any source-code change. If a dependency bump requires code changes beyond trivial type fixes, STOP and report which package and what breaks.
- `npm audit fix --force` — never run it; it takes semver-major jumps.

## Git workflow

- Branch: `advisor/002-dependency-patches` off `dev`
- One commit per app is fine; message style: short imperative sentence (e.g. "Patch vulnerable dependency versions").
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Record the baseline

Run `npm audit --omit=dev` in the repo root and save the output (you will diff against it).

**Verify**: output lists the drizzle-orm HIGH advisory (GHSA-gpj5-g38j-94v9). If it does not, the tree has already been patched — re-check each following step against the live audit output.

### Step 2: Patch the main app (non-breaking)

In the repo root:

1. `npm audit fix` (NO `--force`).
2. Explicitly ensure `drizzle-orm` resolved ≥ 0.45.2: `npm ls drizzle-orm`. If still below, run `npm install drizzle-orm@^0.45.2`.
3. Re-run `npm audit --omit=dev`.

**Verify**: `npm ls drizzle-orm` shows ≥ 0.45.2; audit output no longer lists GHSA-gpj5-g38j-94v9; `npm run lint` and `npm run typecheck` exit 0.

### Step 3: Assess what remains (likely Next.js)

If the audit still reports the Next.js advisories: check the fixed version (`npm audit` prints the fix target). If the fix is within Next 16 stable (e.g. `16.3.x`):

1. `npm install next@<fixed-version> eslint-config-next@<same-minor>` (they must move together).
2. `npm run typecheck` → must exit 0.
3. Smoke test: `npm run dev`, load `/` (landing), `/GetStarted` (login), `/dashboard` (redirects to login when logged out). No build-time or console errors.

If the fixed version is a canary or a major, do NOT install it — record the remaining advisory in your completion report as "requires maintainer decision".

**Verify**: `npm audit --omit=dev` → 0 high-severity advisories, or the only remaining highs are documented in your report as requiring a decision.

### Step 4: Repeat for saas-admin

`cd saas-admin`, then repeat Steps 1–3 (`npm audit fix`, ensure `drizzle-orm ≥ 0.45.2`, same Next.js policy). Keep the resolved `next` version **identical** in both apps.

**Verify**: `cd saas-admin && npm ls drizzle-orm` ≥ 0.45.2; `npm run lint && npm run typecheck` exit 0.

### Step 5: better-auth check

`npm ls better-auth` in both apps. If the audit flagged it and `npm audit fix` bumped it within `^1.4.x`, smoke-test login (email/password) on the main app dev server. If the fix requires a minor jump beyond `^1.4`, do not take it — report it.

**Verify**: login flow works on `npm run dev` (create/sign into a test account or confirm the sign-in POST returns a session cookie, not a 500).

## Test plan

No test framework exists yet (introduced in plan 005). The manual smokes in Steps 3 and 5 are the required verification. If plan 005 has already landed when you execute this, also run `npm test` after each bump → all pass.

## Done criteria

- [ ] `npm audit --omit=dev` in both apps reports 0 high advisories (or remaining ones documented as requiring a maintainer decision)
- [ ] `npm ls drizzle-orm` ≥ 0.45.2 in both apps
- [ ] `next` version identical in both apps
- [ ] `npm run lint` + `npm run typecheck` exit 0 in both apps
- [ ] Only the four manifest/lockfiles are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Any bump requires source-code changes beyond the manifests (report the package, version, and the error).
- `npm run typecheck` fails after a bump and reverting that single bump fixes it — revert, then report the incompatibility.
- `npm audit fix` wants to change `react`/`react-dom` majors.

## Maintenance notes

- The `uuid`→`svix`→`resend` chain is transitive; if it survives `npm audit fix`, it clears when `resend` ships a bump — low urgency, note it and move on.
- Re-run `npm audit --omit=dev` in CI (plan 010) so this doesn't silently regress.
- If Next.js was left unpatched pending a maintainer decision, that decision should also weigh the null-origin Server Actions CSRF advisory — this app uses API routes rather than Server Actions, which lowers (but does not erase) the exposure.
