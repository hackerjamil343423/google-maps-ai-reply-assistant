# Plan 011 Report: Shared Drizzle Schema

## Drift Inventory

- Main schema: 34 `pgTable` definitions.
- Admin schema: 27 `pgTable` definitions.
- Main-only tables now include `assistant_threads`, `assistant_messages`, `review_analysis_reports`, `review_comparison_reports`, `review_comparison_report_businesses`, `stripe_webhook_events`, and `rate_limit_buckets`.
- Main-only columns added in this pass: `reviews.dismissed_at` and `subscriptions.trial_warning_sent_at`. These are currently absent from `saas-admin/src/lib/db/schema.ts`.
- Admin code reads/writes shared tables such as users, workspaces, subscriptions, reviews, jobs, settings, blog, and admin audit/API-key tables. I did not find admin writes to a table whose definition is actively divergent in a way that changes written columns, but the admin schema can no longer see the new main-app columns/tables.
- Both apps still have independent `drizzle.config.ts` files pointing at the same database. Root uses `out: "./drizzle"` and `schema: "./src/lib/db/schema.ts"`; admin uses `out: "./drizzle"` and `schema: "./src/lib/db/schema.ts"` relative to `saas-admin/`.

## Options

### A. npm workspaces + `packages/db`

Feasibility: likely best long-term, but it changes install/deploy shape. The repo root is currently the main app, so converting it into a workspace root requires either keeping the main app at root with workspace config or moving it into an app folder. Both Vercel and Coolify builds need workspace-aware install commands.

Deploy impact: highest. Lockfiles should consolidate, and both deploy targets must install workspace dependencies correctly.

Migration history: cleanest once complete. `packages/db` owns schema exports; the root app owns `drizzle/` migrations.

Day-2 ergonomics: best. One schema edit, one migration owner, both apps consume the same types.

### B. Shared source without a package

Feasibility: medium. Admin could map an alias such as `@shared-db/*` to `../src/lib/db/*` or a top-level `shared/db/*`. Next can compile external source with the right config, but Coolify must build with the repository root available, not only the `saas-admin/` subdirectory.

Deploy impact: medium. No package-manager conversion, but admin build config changes and deployment context must include parent directories.

Migration history: good if root remains the only migration owner.

Day-2 ergonomics: good, but cross-app imports from outside the app root are easier to break in deployment.

### C. Generated mirror

Feasibility: highest short-term. Add a script that derives/copies `saas-admin/src/lib/db/schema.ts` from the root schema and a CI check that fails when the mirror is stale.

Deploy impact: low. Existing app layouts and lockfiles remain unchanged.

Migration history: still needs a policy change so only the root app runs Drizzle migrations.

Day-2 ergonomics: acceptable but weaker than A/B. Developers must run/check the sync script.

## Migration Ownership Rule

One database needs one migration owner. Root app should own `src/lib/db/schema.ts`, `drizzle/`, `db:generate`, and `db:push`. The admin app should become a schema consumer and remove or disable its `db:generate`/`db:push` scripts after the shared schema migration lands.

Retire `saas-admin/drizzle/` as historical bootstrap only. Before deleting scripts, inspect the production `__drizzle_migrations` state and confirm the root migration journal is the one operators use. Do not let both apps continue pushing independent histories.

## Recommendation

Choose Option C as an immediate Plan 012, then move to Option A when deployment bandwidth exists.

Rationale: the current drift is already real and widening; a generated mirror plus CI drift check gives a quick guard without changing Vercel/Coolify install semantics. Workspaces are the cleaner destination, but they are a deployment migration, not just a schema cleanup.

## Plan 012 Outline

1. Add `scripts/sync-admin-schema.ts` that copies or generates the admin schema from `src/lib/db/schema.ts`.
2. Run it once and commit the resulting admin schema update, including `dismissedAt`, `trialWarningSentAt`, `stripeWebhookEvents`, and `rateLimitBuckets`.
3. Add `npm run schema:check` that runs the sync in check mode and fails on diff.
4. Add the check to CI.
5. Remove admin `db:generate` and `db:push` scripts or replace them with messages pointing to the root app.
6. Document root migration ownership in `README.md` and `CLAUDE.md`.

## Risks

- Admin deployment may accidentally build against a stale generated schema if the CI check is bypassed.
- Root/admin enum drift can still happen if the sync script is too naive.
- Retiring the admin migration history requires care around the live Drizzle journal.

## Rollback

Option C is easy to roll back: restore the previous admin schema and scripts. The database remains governed by existing root migrations.

## Ready Checklist

- [ ] Decide whether generated mirror is acceptable as an interim guard.
- [ ] Confirm production migration journal ownership.
- [ ] Add schema sync/check script.
- [ ] Update admin schema and remove admin migration commands.
- [ ] Add CI drift check.
