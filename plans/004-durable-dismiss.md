# Plan 004: Make review dismissal durable (stop delete-and-resurrect, never auto-reply to a dismissed review)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ca8b8b1f..HEAD -- "src/app/api/reviews/[id]/dismiss/route.ts" src/app/api/reviews/route.ts src/lib/db/schema.ts src/lib/google/business-profile.ts src/lib/jobs/handlers/sync-reviews.ts`
> On any in-scope drift, compare the "Current state" excerpts against live code;
> on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (schema change + touches the reviews list endpoint; mitigated by keeping the sync upsert untouched)
- **Depends on**: 003 recommended first (same files' neighborhood; avoids merge conflicts) but not required
- **Category**: bug
- **Planned at**: commit `ca8b8b1f`, 2026-07-02

## Why this matters

"Dismiss" currently **hard-deletes the review row**. The `reviews` table has no dismissed/hidden column, and the Google sync upserts every review it fetches — so on the next scheduled sync the deleted review is re-inserted, detected as *new* (`xmax = 0`), and, for workspaces with `approvalMode === "auto"`, a `generate_reply` job is enqueued that **publicly posts an AI reply to the exact review the owner explicitly rejected**. This is the single most direct violation of user intent in the product, plus wasted OpenAI spend on every sync cycle after a dismissal.

The fix: dismissal becomes a persistent flag. The row survives, the sync upsert then naturally reports it as an update (not new), no job is enqueued, and the list endpoint hides it.

## Current state

Relevant files:

- `src/app/api/reviews/[id]/dismiss/route.ts` — the delete is at line 58: `await db.delete(reviews).where(eq(reviews.id, reviewId));`
- `src/lib/db/schema.ts:222-246` — `reviews` table: columns are `id, businessId, googleReviewId, authorName, rating, text, reviewedAt, syncedAt, createdAt, updatedAt` plus a **unique index on `googleReviewId`** (line 244, `reviews_google_review_unique`). No dismissal column.
- `src/lib/google/business-profile.ts:489-522` — sync batch-upserts reviews with `onConflictDoUpdate({ target: reviews.googleReviewId, set: {authorName, rating, text, reviewedAt, syncedAt, updatedAt} })` and returns `isNew: sql<boolean>\`(xmax = 0)\``. Because the upsert only re-inserts when the row is *gone*, keeping the row is what fixes resurrection — **do not modify this file** beyond confirming it compiles.
- `src/lib/jobs/handlers/sync-reviews.ts:26-42` — enqueues `generate_reply` for each `newReviewIds` entry when `approvalMode === "auto"`.
- `src/app/api/reviews/route.ts` — list endpoint; fetches reviews at line 154 (`db.query.reviews.findMany({ where: inArray(reviews.businessId, businessIds), ... })`), derives UI status from the latest reply (`toUiStatus`, lines 24–33), computes summary/analytics over all fetched rows.

Excerpt of the delete site:

```ts
// src/app/api/reviews/[id]/dismiss/route.ts:51-60
  void recordReplyEvent({
    workspaceId,
    reviewId,
    eventType: "rejected",
    rating: review.rating,
  });

  await db.delete(reviews).where(eq(reviews.id, reviewId));

  return NextResponse.json({ success: true });
```

(If plan 003 landed first, the `void` here is already an `await` — that's fine.)

Conventions: schema changes in `src/lib/db/schema.ts`, then `npm run db:generate` + `npm run db:push` (CLAUDE.md "Common Workflow"). Timestamps use `timestamp("...", { withTimezone: true })`.

**Product semantics to honor** (decided at planning time): a dismissed review still exists publicly on Google, so it must still count in *analytics* (ratings, monthly trends). It is only removed from the actionable list and from auto-reply. Do not filter dismissed rows out of the analytics aggregates in this plan.

## Commands you will need

| Purpose   | Command               | Expected on success |
|-----------|------------------------|---------------------|
| Lint      | `npm run lint`         | exit 0              |
| Build     | `npm run typecheck`    | exit 0              |
| Migration | `npm run db:generate`  | new file in `drizzle/` |
| Apply     | `npm run db:push`      | exit 0 (needs `DATABASE_URL`) |

## Scope

**In scope**:
- `src/lib/db/schema.ts` (add one column to `reviews`) + generated migration in `drizzle/`
- `src/app/api/reviews/[id]/dismiss/route.ts`
- `src/app/api/reviews/route.ts` (exclude dismissed rows from the *list* and *pending counts*, not from analytics)

**Out of scope**:
- `src/lib/google/business-profile.ts` — the upsert needs no change (dismissed rows update in place; `isNew` stays false).
- `src/lib/jobs/handlers/sync-reviews.ts` — only *new* rows are enqueued and a dismissed row can no longer be "new"; no change needed.
- Analytics/report routes (`src/app/api/analytics/**`) — dismissed reviews stay in analytics by design.
- Any UI for viewing/undoing dismissals (see Maintenance notes).
- Bulk approve (`src/app/api/reviews/bulk/approve/route.ts`) — it operates on ids from the list, which will no longer include dismissed rows.

## Git workflow

- Branch: `advisor/004-durable-dismiss` off `dev`
- Commit per step; short imperative sentences.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add the column

In `src/lib/db/schema.ts`, inside the `reviews` table (lines 222–241), after `syncedAt`, add:

```ts
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
```

Run `npm run db:generate`, confirm a new migration under `drizzle/` contains `ALTER TABLE "reviews" ADD COLUMN "dismissed_at"`, then `npm run db:push`.

**Verify**: migration file exists with that ALTER; `npm run typecheck` → exit 0.

### Step 2: Flag instead of delete

In `src/app/api/reviews/[id]/dismiss/route.ts:58`, replace the delete with:

```ts
  await db
    .update(reviews)
    .set({ dismissedAt: new Date(), updatedAt: new Date() })
    .where(eq(reviews.id, reviewId));
```

Keep the `recordReplyEvent({ eventType: "rejected", ... })` call as is. Make the operation idempotent: if the review is already dismissed, this simply re-stamps — acceptable.

**Verify**: `grep -n "db.delete(reviews)" "src/app/api/reviews/[id]/dismiss/route.ts"` → no match. `npm run typecheck` → exit 0.

### Step 3: Hide dismissed reviews from the actionable list

In `src/app/api/reviews/route.ts:154`, extend the `where` to exclude dismissed rows:

```ts
  const reviewRows = await db.query.reviews.findMany({
    where: and(
      inArray(reviews.businessId, businessIds),
      isNull(reviews.dismissedAt)
    ),
    orderBy: [desc(reviews.reviewedAt)],
  });
```

Import `and`, `isNull` from `drizzle-orm` (line 1 currently imports `desc, eq, inArray`).

Note the tension with the product semantics above: this endpoint also computes the `analytics` block over the same fetched rows. Excluding dismissed rows from this one fetch means the dashboard's inline analytics skips them while the dedicated report routes keep them. That is accepted for this plan (dismissed reviews are typically few); flag it in your completion report so plan 008 (which rebuilds these aggregates in SQL) can decide deliberately.

**Verify**: `npm run lint && npm run typecheck` → exit 0.

### Step 4: Confirm no other code path resurrects or re-enqueues

Run: `grep -rn "newReviewIds" src/lib/` — the only producer must be the upsert in `business-profile.ts` (rows with `xmax = 0`, i.e. genuinely inserted) and the only consumer `sync-reviews.ts`. Since dismissed rows persist, they can never be in `newReviewIds` again. No code change; this step is evidence for the completion report.

**Verify**: grep output shows only `src/lib/google/business-profile.ts` and `src/lib/jobs/handlers/sync-reviews.ts`.

## Test plan

If plan 005 (vitest) has landed, add `src/app/api/reviews/__tests__/dismiss.test.ts` (or a lib-level test if route testing is awkward): with a mocked `db`, assert the dismiss handler issues an `update` setting `dismissedAt` and never calls `delete`. Otherwise, manual verification: on `npm run dev` with a seeded workspace, dismiss a review, trigger `/api/google/sync-reviews`, and confirm the review does not reappear in `/dashboard/reviews` and no `generate_reply` job row is created for it (`npm run db:studio` → `background_jobs`).

## Done criteria

- [ ] `reviews.dismissed_at` column exists in schema + migration applied
- [ ] Dismiss route updates the flag; `db.delete(reviews...)` no longer exists anywhere: `grep -rn "delete(reviews)" src/` → no matches
- [ ] Reviews list endpoint filters `isNull(dismissedAt)`
- [ ] `npm run lint` and `npm run typecheck` exit 0
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Excerpts don't match live code (drift).
- `DATABASE_URL` unavailable for `db:push` — implement code changes, report the migration as blocked.
- You find other callers of `db.delete(reviews)` beyond the dismiss route — report them (they may be legitimate, e.g. workspace deletion cascade is FK-level, not app-level).
- The `reviews` list endpoint's shape tests (if any exist by then) fail after Step 3.

## Maintenance notes

- **Deferred UI follow-up**: there is now data for a "Dismissed" tab (restore = set `dismissedAt` to null). The dashboard reviews page (`src/app/dashboard/reviews/`) has status tabs that could host it. Deliberately out of scope here.
- Plan 008 rewrites the reviews endpoint's aggregates in SQL — it must carry the `isNull(dismissedAt)` condition for the *list* and decide explicitly whether analytics include dismissed rows (recommendation: include, matching the dedicated report routes).
- Reviewer should scrutinize: that the sync upsert's `set` clause does NOT include `dismissedAt` (it doesn't at `ca8b8b1f`) — otherwise a sync would un-dismiss reviews.
