# Plan 008: Move reviews-list pagination/aggregation into SQL; bound the analytics queries

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ca8b8b1f..HEAD -- src/app/api/reviews/route.ts src/app/api/analytics/reports/url/route.ts src/app/api/analytics/comparison-reports/route.ts src/lib/assistant/context.ts`
> On any in-scope drift, compare the "Current state" excerpts against live code;
> on a mismatch, STOP. Note: plan 004 adds an `isNull(reviews.dismissedAt)`
> condition to this endpoint — if present, carry it through every new query.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED (behavior-visible refactor of the primary dashboard endpoint)
- **Depends on**: plans/005-vitest-baseline.md (required); execute after plan 004 if both are selected (it touches the same `where`)
- **Category**: perf
- **Planned at**: commit `ca8b8b1f`, 2026-07-02

## Why this matters

`GET /api/reviews` — the endpoint behind the main dashboard screen — currently:

1. fetches **every review** for the workspace (`findMany` with no `limit`, line 154),
2. fetches **every reply** for all those reviews (line 163),
3. then filters, searches, sorts, paginates (`.slice`), and computes a 12-month trend + rating distribution **in JavaScript** (lines 217–328), on every page view, filter change, and sort click. `per_page` may be up to 500 (line 108).

Cost grows linearly with review history forever. The same unbounded pattern repeats in the analytics report routes, which fetch all reviews and then apply the period filter in JS. Secondary: the assistant chat rebuilds two workspace-wide `COUNT(*)` aggregates on every message.

## Current state

All excerpts verified at `ca8b8b1f`.

- `src/app/api/reviews/route.ts` (330+ lines, read in full):
  - `toUiStatus` (lines 24–33): status is derived from the **latest reply by `createdAt`** — `pending` when no reply or `reply.status !== "posted"`; `auto` when posted with `source === "ai"`; `manual` when posted with `source === "manual"`.
  - Query params (90–111): `status` (`all|pending|auto|manual`), `sortBy` (`relevant|newest|lowest|rating`), `page`, `per_page` (≤500), `search` (matched against `authorName + text + reply.content`, lowercased), `rating_lte`, `business_id`.
  - Tenancy scoping (113–131): `businessIds` from workspace + `getAccessibleBusinessIds` — **keep untouched**.
  - Response shape (289–328): `{ reviews[], summary{ total, avgRating, replied, pending, counts{pending,auto,manual} }, pagination{ page, perPage, total, totalPages }, analytics{ fiveStarPct, monthly[12]{total,replied}, ratingDist[5..1]{stars,count,pct} }, googleConnected }`. **The shape is the contract — must not change.** Semantics: `summary`/`analytics` are over ALL (unfiltered) reviews; `pagination.total` is over the FILTERED set; `page` is clamped to `totalPages`.
- `src/app/api/analytics/reports/url/route.ts:110-120` — fetches all reviews for a business, then filters by period in JS (`t >= start && t <= end + 86400000`).
- `src/app/api/analytics/comparison-reports/route.ts:157-183` — fetches all reviews for 2–3 businesses, then buckets + period-filters in JS (`>= start && < endExclusive`).
- `src/lib/assistant/context.ts:62-76` — two `count(*)::int` joins per chat message (the `.limit(1)` calls there are no-ops on aggregates).

Conventions: Drizzle query builder + `sql` template for raw fragments (exemplar: the lateral-free batch upsert in `src/lib/google/business-profile.ts:489-522` and raw SQL in `src/lib/jobs/queue.ts:48-55`). Postgres 15+ features are available (Neon).

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Tests     | `npm test`             | all pass            |
| Lint      | `npm run lint`         | exit 0              |
| Build     | `npm run typecheck`    | exit 0              |
| Dev smoke | `npm run dev` + browse `/dashboard/reviews` | list, tabs, search, sort, pagination all behave as before |

## Scope

**In scope**:
- `src/app/api/reviews/route.ts`
- `src/lib/reviews/list-query.ts` (create — the new query layer, unit-testable)
- `src/lib/reviews/__tests__/list-query.test.ts` (create)
- `src/app/api/analytics/reports/url/route.ts` (period bounds into SQL only)
- `src/app/api/analytics/comparison-reports/route.ts` (period bounds into SQL only)
- `src/lib/assistant/context.ts` (drop no-op limits; add short-TTL count cache)

**Out of scope**:
- The JSON response shape of `/api/reviews` — byte-for-byte field compatibility required.
- Tenancy logic (`getAccessibleBusinessIds` and the business filtering, lines 113–131).
- `src/app/api/analytics/reply-quality/route.ts` and other analytics routes — same disease, deferred (note in report).
- Frontend components.
- Adding DB indexes — flag missing ones in the report instead (schema has `reviews_business_id_idx`; a composite `(business_id, reviewed_at desc)` is the likely candidate, but index changes need the maintainer's migration window).

## Git workflow

- Branch: `advisor/008-reviews-sql-pagination` off `dev`
- Commit per step; short imperative sentences.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Build the query layer with tests first

Create `src/lib/reviews/list-query.ts` exporting:

- `buildStatusCondition(status)` — returns a SQL fragment implementing `toUiStatus` semantics **against the latest reply**: use a `LEFT JOIN LATERAL (select ... from review_replies rr where rr.review_id = reviews.id order by rr.created_at desc limit 1) latest ON true`. `pending` ⇔ `latest.id IS NULL OR latest.status <> 'posted'`; `auto` ⇔ `latest.status = 'posted' AND latest.source = 'ai'`; `manual` ⇔ `latest.status = 'posted' AND latest.source = 'manual'`.
- `fetchReviewPage(db, { businessIds, status, search, ratingLte, sortBy, page, perPage })` — one SQL query returning the page rows (review fields + the lateral latest-reply fields) plus a `count(*) OVER ()` total for the filtered set. Sorts: `newest` → `reviewed_at desc`; `lowest` → `rating asc, reviewed_at desc`; `rating` → `rating desc, reviewed_at desc`; `relevant` → same as `newest` (current code's `relevant` falls through to the date sort — preserve exactly). Search: `ILIKE '%' || term || '%'` against `author_name`, `text`, and `latest.content` (`coalesce`'d), mirroring the JS haystack.
- `fetchReviewSummary(db, { businessIds })` — aggregates over ALL reviews: total, `avg(rating)`, status counts via the same lateral (one grouped query), 12-month buckets via `date_trunc('month', reviewed_at)` limited to the last 12 months, rating distribution via `group by rating`.

If plan 004 landed, both functions must include `dismissed_at IS NULL` for the **list/filtered** queries; for the summary/analytics aggregates match whatever the endpoint did after plan 004 (at plan-004 completion: aggregates also computed over the non-dismissed fetch — mirror that, and note the semantic in your report).

Write `src/lib/reviews/__tests__/list-query.test.ts` for the pure parts (condition builders, sort mapping, month-bucket key generation) with mocked `db.execute`.

**Verify**: `npm test` → new suite green; `npm run typecheck` → exit 0.

### Step 2: Switch the route

In `src/app/api/reviews/route.ts`, replace lines 154–328's fetch-everything pipeline with calls to `fetchReviewPage` + `fetchReviewSummary`, then assemble the **identical** response JSON (field names, `analytics.monthly` always length 12 oldest→newest, `ratingDist` ordered 5→1 with `pct` computed the same `Math.round` way, `avgRating` via `Number((x).toFixed(1))`, ISO strings for dates, `initials` via the existing `getInitials`). Keep: the early-return empty-state block (lines 134–152), tenancy scoping, `page` clamping semantics (page beyond last → last page's rows).

**Verify**: `npm run typecheck` → exit 0. Dev smoke against a seeded workspace: for each tab (all/pending/auto/manual) and each sort, the visible list matches pre-change behavior (if you have the old build handy, diff the JSON of `GET /api/reviews?per_page=5` before/after — field-identical output for the same data).

### Step 3: Bound the analytics report queries

- `analytics/reports/url/route.ts:110-120`: add `gte(reviewsTable.reviewedAt, periodBounds.start)` and `lte(reviewsTable.reviewedAt, <end + 86400000 as Date>)` to the `where`; delete the JS `.filter`. Preserve the exact same boundary arithmetic (the +1 day slack on `end`).
- `comparison-reports/route.ts:157-183`: add `gte(reviewedAt, periodBounds.start)` and `lt(reviewedAt, periodEndExclusive)` to the `where`; keep the per-business bucketing loop but delete the in-loop period check.

**Verify**: `npm run typecheck` → exit 0; generating a report on the dev server still works and the "no reviews in period" rejection path still triggers for an out-of-period business.

### Step 4: Assistant context counts

In `src/lib/assistant/context.ts:62-76`: remove the two no-op `.limit(1)` calls, and wrap the two counts in a module-level cache: `Map<workspaceId, { reviewCount, repliedCount, expiresAt }>` with a 60-second TTL. Per-instance on serverless — that's accepted; it exists to stop per-message recomputation within warm instances.

**Verify**: `npm run typecheck` → exit 0; assistant chat still answers with correct counts on the dev server (second message within 60s hits the cache — add a temporary `console.log` to confirm once, then remove it).

## Test plan

- Unit: `list-query.test.ts` (Step 1) — status-condition SQL for all four filters, sort mapping, search-term escaping (a term containing `%` or `_` must be literal-escaped), month-bucket edges (a review from exactly 12 months ago lands in bucket 0; a 13-month-old one is excluded).
- Manual contract check (Step 2) — response-JSON diff on identical data.
- Regression guard: the endpoint must return correct `pagination.total` when `search` + `status` are combined (filtered count, not the unfiltered total).

## Done criteria

- [ ] `grep -n "findMany" src/app/api/reviews/route.ts` → no unbounded review/reply findMany remains (the businesses lookup at line 113 may stay)
- [ ] `/api/reviews` returns a field-identical JSON shape (manually diffed on seeded data)
- [ ] Both report routes filter the period in SQL (no `.filter(` on `reviewedAt` in JS): `grep -n "reviewedAt.getTime\|reviewedAt >= period\|t >= periodBounds" src/app/api/analytics/reports/url/route.ts src/app/api/analytics/comparison-reports/route.ts` → no matches
- [ ] `npm run lint`, `npm run typecheck`, `npm test` exit 0
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Excerpts don't match live code (drift) — especially if plan 004's `dismissedAt` filter is present but shaped differently than described.
- The neon-http driver rejects the lateral-join query — report the exact SQL + error; do not silently regress to fetch-all.
- You cannot reproduce identical `analytics.monthly` semantics in SQL (timezone edge: the JS code buckets by *server-local* year-month via `getFullYear()/getMonth()`; `date_trunc` uses UTC unless told otherwise — if the deployment TZ is not UTC, bucket via `date_trunc('month', reviewed_at AT TIME ZONE 'UTC')` and report the assumption).
- Response-shape diff shows any field difference you cannot explain.

## Maintenance notes

- Recommend (report, don't implement): composite index `reviews (business_id, reviewed_at DESC)` and `review_replies (review_id, created_at DESC)` to serve the page + lateral join.
- `reply-quality/route.ts` still aggregates in JS over an unbounded fetch — same fix pattern applies; deferred.
- Anyone adding a new filter to the reviews screen must add it to `fetchReviewPage`'s SQL, not post-fetch JS — that's the whole point of this plan.
