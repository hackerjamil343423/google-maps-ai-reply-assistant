# Plan 009: Delete dead Geidea payment code and clean repo hygiene

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ca8b8b1f..HEAD -- src/lib/geidea src/app/api/subscription/callback .gitignore docs/geidea-migration-plan.md docs/geidea-payment-fix-plan.md`
> On any in-scope drift, re-run the importer check in Step 1 before deleting anything.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (deleting code with zero importers)
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `ca8b8b1f`, 2026-07-02

## Why this matters

Billing migrated Geidea → Stripe (commit `149125b1`), and the team's own migration doc — `docs/stripe-migration-plan.md:127` and `:289` — explicitly instructs deleting the Geidea client. It's still shipped: `src/lib/geidea/client.ts` (353 lines of payment/signature code reading four undeclared `GEIDEA_*` env vars) and `src/lib/geidea/types.ts`, with **zero importers** (verified by project-wide grep at `ca8b8b1f`). Dead payment code confuses audits and invites accidental re-wiring. Separately, scratch artifacts are tracked in git (`saas-admin.html` ~362 KB, `design-output/`, a stray root `favicon-16x16.png`) and local dev noise (`dev-server*.log`, a WhatsApp image, `launch-video/`) sits one `git add .` away from being committed because `.gitignore` has no rules for it.

## Current state

- `src/lib/geidea/client.ts` — starts with `import crypto from "crypto"` and `const GEIDEA_BASE = process.env.GEIDEA_BASE_URL...`; no file outside `src/lib/geidea/` imports from it (`grep -rn "lib/geidea" src --include="*.ts" --include="*.tsx"` → hits only inside the folder itself).
- `src/app/api/subscription/callback/route.ts` — 5-line tombstone: returns `410 Gone`, comment says Stripe webhooks now arrive at `/api/subscription/webhook`.
- `.gitignore` — covers `.env*`, `/.next/`, `*.tsbuildinfo` etc.; has NO rules for `dev-server*.log`, `launch-video/`, or stray media.
- Tracked scratch (verify with `git ls-files` before removing): `saas-admin.html`, `design-output/` contents, root `favicon-16x16.png` (the served icon is `src/app/icon.png`; a root-level file outside `public/` is not served by Next).
- Untracked local noise (per `git status`): `dev-server.log`, `dev-server.err.log`, `WhatsApp Image 2026-05-23 at 10.42.06.jpeg`, `launch-video/`.
- Docs: `docs/geidea-migration-plan.md` and `docs/geidea-payment-fix-plan.md` describe Geidea as current, with no superseded marker.

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Lint      | `npm run lint`         | exit 0              |
| Build     | `npm run typecheck`    | exit 0              |

## Scope

**In scope**:
- Delete: `src/lib/geidea/` (whole folder), `src/app/api/subscription/callback/` (route folder)
- Delete from git tracking: `saas-admin.html`, `design-output/`, `favicon-16x16.png` (root)
- `.gitignore` (append rules)
- Prepend a superseded banner to `docs/geidea-migration-plan.md` and `docs/geidea-payment-fix-plan.md`

**Out of scope**:
- The user's local files `WhatsApp Image *.jpeg`, `launch-video/`, `dev-server*.log` — do NOT delete them (they are the operator's working files); only gitignore them.
- `src/lib/streampay/` — already removed before `ca8b8b1f`; if you find it, that's drift → STOP.
- `docs/stripe-migration-plan.md` and all other docs (plan 010 handles doc content).
- Anything in `saas-admin/` (its baseline migration mentions Geidea columns — DB-level cleanup is NOT this plan).

## Git workflow

- Branch: `advisor/009-remove-geidea` off `dev`
- Two commits: (1) delete dead code + tracked scratch, (2) gitignore + doc banners.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Prove the code is dead, then delete it

1. `grep -rn "geidea" src --include="*.ts" --include="*.tsx" -il` → must list ONLY `src/lib/geidea/client.ts` and `src/lib/geidea/types.ts`.
2. `grep -rn "subscription/callback" src` → must return no live references (links/fetches) outside the route folder itself.
3. Delete `src/lib/geidea/` and `src/app/api/subscription/callback/`.

**Verify**: `npm run typecheck` → exit 0 (nothing imported them); `grep -rin "geidea" src` → no matches.

### Step 2: Untrack scratch artifacts

1. Confirm tracked: `git ls-files saas-admin.html design-output favicon-16x16.png` → lists them.
2. Confirm the favicon is unused: `grep -rn "favicon-16x16" src public saas-admin/src` → no matches (if any match, keep the file and note it).
3. `git rm saas-admin.html favicon-16x16.png` and `git rm -r design-output`.

**Verify**: `git ls-files | grep -iE "saas-admin.html|design-output|favicon-16x16"` → empty.

### Step 3: Gitignore the local noise

Append to `.gitignore`:

```
# local dev/scratch noise
dev-server*.log
launch-video/
*.jpeg
```

(`*.jpeg` is intentionally broad: no tracked `.jpeg` exists at `ca8b8b1f` — confirm with `git ls-files | grep -i jpeg` → empty — and product imagery lives in `public/` as other formats. If that grep is non-empty, narrow the rule to the specific filename instead.)

**Verify**: `git status --porcelain` no longer lists `dev-server.log`, `dev-server.err.log`, the WhatsApp image, or `launch-video/`.

### Step 4: Mark the Geidea docs superseded

Prepend to BOTH `docs/geidea-migration-plan.md` and `docs/geidea-payment-fix-plan.md`:

```markdown
> **SUPERSEDED (2026-06)**: Billing migrated to Stripe (see `docs/stripe-migration-plan.md`
> and commit `149125b1`). This document is retained as history only; the Geidea
> integration code has been removed from the codebase.
```

**Verify**: `head -3 docs/geidea-migration-plan.md` shows the banner.

## Test plan

No behavior change; verification is the greps + typecheck above. If plan 005 landed, `npm test` must still pass (it will — no test imports Geidea).

## Done criteria

- [ ] `grep -rin "geidea" src` → no matches; folder and callback route deleted
- [ ] Tracked scratch files removed from the index
- [ ] `.gitignore` covers the local noise; `git status` is clean of it
- [ ] Both Geidea docs carry the superseded banner
- [ ] `npm run lint` and `npm run typecheck` exit 0
- [ ] `plans/README.md` status row updated

## STOP conditions

- Step 1's grep finds an importer of `lib/geidea` outside the folder — the code is not dead; report the importer.
- Any external reference to `/api/subscription/callback` (e.g. in `vercel.json`, docs describing a configured Geidea dashboard URL) suggests live traffic still hits it — report before deleting; a 404 for a forgotten gateway config is a worse failure mode than a 410.
- `git ls-files` shows `.jpeg` files that ARE product assets.

## Maintenance notes

- Env cleanup for the operator (completion report): `GEIDEA_BASE_URL`, `GEIDEA_MERCHANT_PUBLIC_KEY`, `GEIDEA_API_PASSWORD`, `GEIDEA_CALLBACK_SECRET` can be removed from all deployment environments, and any remaining Geidea credentials should be revoked at the provider since the integration is gone.
- `saas-admin/drizzle/0000_*.sql` still contains Geidea columns in its baseline migration — harmless history, but the schema-dedup spike (plan 011) should account for it.
