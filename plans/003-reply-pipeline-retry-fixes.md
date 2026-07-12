# Plan 003: Fix reply-pipeline retry semantics (double retry, wrong-row posting, cron dedupe, duplicate trial emails, dropped writes)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ca8b8b1f..HEAD -- src/lib/jobs src/lib/reviews/server.ts src/lib/analytics/reply-events.ts src/app/api/cron/schedule-syncs/route.ts src/app/api/cron/trial-expiry/route.ts src/lib/db/schema.ts "src/app/api/reviews/[id]/reply/post/route.ts"`
> On any in-scope drift, compare the "Current state" excerpts against live code;
> on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW–MED (touches the auto-post money path; each fix is small and independently verifiable)
- **Depends on**: none (plan 005's tests strengthen this; if 005 already landed, add the unit tests listed in "Test plan")
- **Category**: bug
- **Planned at**: commit `ca8b8b1f`, 2026-07-02

## Why this matters

The background pipeline (sync reviews → generate AI reply → auto-post to Google) has five defects that show up exactly when something goes wrong mid-flight:

1. **Double retry**: when an auto-post to Google fails, the generate handler *both* enqueues a dedicated `post_reply` retry *and* re-throws so the whole `generate_reply` job retries. The re-run pays OpenAI again, inserts a *new* reply row (the old one is now `failed`, and drafts are only reused while status is `draft`), and races the `post_reply` job — two different reply texts compete to be posted publicly on the business's Google profile.
2. **Wrong row marked posted**: `markReplyPosted` ignores which reply was actually sent and stamps the *newest* row by `createdAt`, overwriting its content. A retry that posts an old draft can clobber a newer draft the user wrote in the meantime.
3. **Sync dedupe misses running jobs**: the hourly scheduler only skips workspaces with a `pending` sync job, so a currently-`running` sync gets a second one enqueued behind it.
4. **Duplicate trial emails**: the daily trial-expiry cron emails every sub whose trial ends within 2 days, with no sent-marker — the same owner is emailed on day-2 and again on day-1. (Its doc comment also says "3 days", which the code contradicts.)
5. **Dropped analytics/usage writes**: usage counters and reply analytics are fired with `void`/un-awaited inserts; on serverless the response can return before the insert commits, silently losing events.

## Current state

Relevant files:

- `src/lib/jobs/handlers/generate-reply.ts` — generate + auto-post handler; the double-retry `catch` is at lines 109–120
- `src/lib/jobs/worker.ts` — `runNextJob`; a thrown handler error re-queues the job with backoff (lines 37–56)
- `src/lib/jobs/handlers/post-reply.ts` — posts a specific `payload.replyId`, then calls `markReplyPosted` *without* that id (lines 40–52)
- `src/lib/reviews/server.ts` — `saveDraftReplyForReview` (lines 66–122; reuses only rows with `status: "draft"`), `markReplyPosted` (lines 124–182; updates newest row by `createdAt`), `markReplyFailed` (lines 184–190)
- `src/app/api/reviews/[id]/reply/post/route.ts` — manual post route; also calls `markReplyPosted` without an id (lines ~133–138) and uses `void` writes (lines ~140–150)
- `src/app/api/cron/schedule-syncs/route.ts` — dedupe filters `eq(backgroundJobs.status, "pending")` only (lines 34–43)
- `src/app/api/cron/trial-expiry/route.ts` — windowed select with no sent-marker (lines 24–61); stale comment at lines 5–6
- `src/lib/analytics/reply-events.ts` — `recordReplyEvent` deliberately does not await its insert (lines 22–36)
- `src/lib/db/schema.ts` — `subscriptions` table at lines 362–381 (you will add one column)

Key excerpts as of `ca8b8b1f`:

```ts
// src/lib/jobs/handlers/generate-reply.ts:109-120
    } catch (error) {
      // Mark failed and enqueue a post_reply retry so the user can see it
      await markReplyFailed(draft.id);
      await enqueueJob({
        workspaceId,
        type: "post_reply",
        payload: { reviewId, replyId: draft.id },
        runAt: computeBackoff(1),
        maxAttempts: 3,
      });
      throw error; // Re-throw so the job is also retried at the generate level
    }
```

```ts
// src/lib/reviews/server.ts:124-138 (head of markReplyPosted)
export async function markReplyPosted(args: {
  reviewId: string;
  content: string;
  source: "ai" | "manual";
  userId: string | null;
}) {
  ...
  const existingLatest = await db.query.reviewReplies.findFirst({
    where: eq(reviewReplies.reviewId, args.reviewId),
    orderBy: [desc(reviewReplies.createdAt)],
    columns: { id: true },
  });
```

```ts
// src/app/api/cron/schedule-syncs/route.ts:37-43
    .where(
      and(
        inArray(backgroundJobs.workspaceId, uniqueWorkspaceIds),
        eq(backgroundJobs.type, "sync_reviews"),
        eq(backgroundJobs.status, "pending")
      )
    );
```

Conventions: DB access through the Drizzle query builder (`db.query.*.findFirst`, `db.update(...).set(...).where(...)`); schema changes go in `src/lib/db/schema.ts` then `npm run db:generate` + `npm run db:push` (see `CLAUDE.md` "Common Workflow").

## Commands you will need

| Purpose   | Command                        | Expected on success |
|-----------|--------------------------------|---------------------|
| Lint      | `npm run lint`                 | exit 0              |
| Build     | `npm run typecheck`            | exit 0              |
| Migration | `npm run db:generate`          | new file in `drizzle/` |
| Apply     | `npm run db:push`              | exit 0 (needs `DATABASE_URL` in `.env`) |
| Tests     | `npm test` (only if plan 005 landed) | all pass      |

## Scope

**In scope**:
- `src/lib/jobs/handlers/generate-reply.ts`
- `src/lib/jobs/handlers/post-reply.ts`
- `src/lib/reviews/server.ts`
- `src/lib/analytics/reply-events.ts`
- `src/app/api/reviews/[id]/reply/post/route.ts`
- `src/app/api/reviews/[id]/reply/generate/route.ts` (only the `void` write sites)
- `src/app/api/reviews/bulk/approve/route.ts` (only the `void` write sites)
- `src/app/api/reviews/[id]/dismiss/route.ts` (only the `void recordReplyEvent` site)
- `src/app/api/cron/schedule-syncs/route.ts`
- `src/app/api/cron/trial-expiry/route.ts`
- `src/lib/db/schema.ts` (one new column) + generated migration in `drizzle/`

**Out of scope**:
- `src/lib/jobs/queue.ts` — the claim/backoff mechanics are correct; don't touch.
- The Stripe webhook and subscription access logic (plan 006).
- The dismiss route's hard-delete behavior (plan 004).
- Any UI component.

## Git workflow

- Branch: `advisor/003-reply-pipeline-retries` off `dev`
- Commit per step; short imperative sentences.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Single retry owner for failed auto-posts

In `src/lib/jobs/handlers/generate-reply.ts`, in the `catch` block at lines 109–120: **delete the `throw error;` line** and replace it with a `return;` after the enqueue. The enqueued `post_reply` job (3 attempts, backoff) becomes the sole retry mechanism; the `generate_reply` job completes as done, so OpenAI is not re-billed and no second reply row is created. Update the comment to say the `post_reply` job owns the retry.

Important nuance to preserve: errors thrown *before* the auto-post block (review not found, OpenAI failure, token unavailable at line 85) must still propagate so the generate job itself retries. Only the post-failure path changes.

**Verify**: `grep -n "throw error" src/lib/jobs/handlers/generate-reply.ts` → no match in the auto-post catch (the file may keep other throws above the try block). `npm run typecheck` → exit 0.

### Step 2: Post the exact reply row

In `src/lib/reviews/server.ts`, add an optional `replyId?: string` to `markReplyPosted`'s args. When provided, skip the `existingLatest` lookup and update `where(eq(reviewReplies.id, args.replyId))` directly (same `set` payload). When absent, keep current behavior.

Update callers to pass the concrete id they hold:
- `src/lib/jobs/handlers/generate-reply.ts:93-98` → add `replyId: draft.id`
- `src/lib/jobs/handlers/post-reply.ts:46-51` → add `replyId: payload.replyId`
- `src/app/api/reviews/[id]/reply/post/route.ts` (call at ~133) → pass the id of the reply row the route resolved, if it holds one (`latestReply?.id`); if the route genuinely posts free-form content with no existing row, leave it without `replyId` (insert path).

**Verify**: `npm run typecheck` → exit 0; `grep -n "replyId" src/lib/reviews/server.ts` shows the new arg used in the update's `where`.

### Step 3: Dedupe against running syncs

In `src/app/api/cron/schedule-syncs/route.ts:41`, replace `eq(backgroundJobs.status, "pending")` with `inArray(backgroundJobs.status, ["pending", "running"])` (`inArray` is already imported at line 1).

**Verify**: `grep -n "pending.*running\|running.*pending" src/app/api/cron/schedule-syncs/route.ts` → 1 match. `npm run typecheck` → exit 0.

### Step 4: Send each trial warning once

1. In `src/lib/db/schema.ts`, add to the `subscriptions` table (lines 362–381): `trialWarningSentAt: timestamp("trial_warning_sent_at", { withTimezone: true }),` (nullable, no default).
2. `npm run db:generate` → confirm a new migration file appears under `drizzle/`; `npm run db:push` to apply (requires `DATABASE_URL`; if unset, STOP and report — do not hand-write SQL).
3. In `src/app/api/cron/trial-expiry/route.ts`: add `isNull(dbSchema.subscriptions.trialWarningSentAt)` to the `where` (import `isNull` from `drizzle-orm`), and after a successful `sendTrialExpiryEmail`, update the row: set `trialWarningSentAt: new Date()` for that `workspaceId`.
4. Fix the doc comment (lines 4–7): it says "within the next 3 days (or exactly 1 day)"; the window is 2 days — make the comment match the code.

**Verify**: `npm run typecheck` → exit 0; `grep -n "trialWarningSentAt\|trial_warning_sent_at" src/lib/db/schema.ts src/app/api/cron/trial-expiry/route.ts` → hits in both files.

### Step 5: Stop dropping usage/analytics writes

1. In `src/lib/analytics/reply-events.ts`, make `recordReplyEvent` `await` its insert inside a `try/catch` that swallows the error (the "never break the main flow" intent stays; the promise no longer floats).
2. At each `void incrementUsageCounter(...)` / `void recordReplyEvent(...)` call site listed in Scope, replace `void` with `await`. These are cheap single-row inserts/updates; `incrementUsageCounter` (in `src/lib/subscription/server.ts`) already catches internally — check it does not throw on failure before removing `void`; if it can throw, wrap the await in try/catch that logs and continues.

**Verify**: `grep -rn "void incrementUsageCounter\|void recordReplyEvent" src/` → no matches. `npm run lint && npm run typecheck` → exit 0.

## Test plan

If plan 005 (vitest) has landed, add `src/lib/jobs/__tests__/generate-reply-retry.test.ts`:
- mock `@/lib/db`, `@/lib/ai/generate-review-reply`, `@/lib/google/business-profile`, `@/lib/reviews/server`, and `../queue`;
- case 1 (regression for fix 1): `postGoogleReviewReplyWithToken` rejects → assert `enqueueJob` called once with `type: "post_reply"` and the handler **resolves** (does not reject);
- case 2: OpenAI failure (mock `generateReviewReply` rejects) → handler rejects (generate-level retry preserved);
- case 3 (fix 2): `markReplyPosted` receives `replyId: draft.id`.

If 005 has not landed, verification is the greps + typecheck above; note the missing tests in your completion report.

## Done criteria

- [ ] Auto-post failure path: enqueues exactly one `post_reply` job and does not re-throw (code inspection + test if available)
- [ ] `markReplyPosted` updates by `replyId` when provided; all three callers pass ids where they hold one
- [ ] schedule-syncs dedupe covers `pending` and `running`
- [ ] `subscriptions.trialWarningSentAt` exists in schema + migration; trial cron filters on it and sets it after send; comment matches the 2-day window
- [ ] No `void incrementUsageCounter` / `void recordReplyEvent` remain in `src/`
- [ ] `npm run lint` and `npm run typecheck` exit 0
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Excerpts don't match live code (drift).
- `DATABASE_URL` is not available for `npm run db:push` — apply steps 1–3 and 5, report step 4 as blocked at the migration.
- You find additional callers of `markReplyPosted` beyond the three listed — report them before changing the signature.
- Changing `recordReplyEvent` to await causes a type error cascade in more than the listed files.

## Maintenance notes

- After this lands, a `post_reply` job is the *only* retry path for failed auto-posts. If someone later adds a new failure branch inside the auto-post `try`, it must not reintroduce a re-throw after enqueueing.
- Plan 004 (durable dismiss) touches `sync-reviews` enqueue behavior; no conflict, but merge this first to keep diffs clean.
- Reviewer should scrutinize: the distinction between pre-post errors (still thrown → generate retries) and post errors (enqueue + return) in `generate-reply.ts`.
- Deferred: a `trialWarningSentAt` reset when a trial is extended (rare admin action; acceptable to re-not-send).
