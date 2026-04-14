# AI Replier — Gap-Filling Implementation Plan

**Created:** 2026-04-14  
**Deployment:** Coolify (self-hosted Docker)  
**Cron provider:** cron-job.org (external, free)

---

## Gaps Identified from Audit

1. Auto-post mode not implemented (`approvalMode: "auto"` setting unused)
2. No background job queue (sync is blocking, can timeout on 1000+ reviews)
3. No scheduled auto-sync (users must click "Sync Reviews" manually)
4. No retry on failed posts (failed replies stay stuck forever)
5. No Google Pub/Sub webhook (new reviews only found on manual sync)
6. No reply quality analytics (no tracking of tone effectiveness, edit rates, etc.)

---

## Priority Order

| # | Gap | Complexity | Shares infra? | Status |
|---|-----|-----------|---------------|--------|
| 1 | Auto-post mode | Tiny — ~15 lines | No | [x] Done |
| 2 | Job queue foundation | Medium | Yes — base for 3 & 4 | [x] Done |
| 3 | Retry on failed posts | Small | Yes — uses queue | [x] Done |
| 4 | Scheduled auto-sync | Small | Yes — uses queue | [x] Done |
| 5 | Reply quality analytics | Medium | No | [x] Done |
| 6 | Google Pub/Sub webhook | Large — external GCP setup | No | [ ] Not started |

---

## Gap 1 — Auto-Post Mode ✅

**File modified:** `src/app/api/reviews/[id]/reply/generate/route.ts`

- Added `approvalMode: true` to the `aiSettings` column selection
- After saving draft, checks `approvalMode === "auto"`
- If auto: fetches token via `getGoogleAccessTokenForWorkspace()`, calls `postGoogleReviewReplyWithToken()` → marks reply `posted`
- If auto-post fails: reply stays as draft (silent fallback, user can post manually)
- Response includes `autoPosted: true/false` flag

---

## Gap 2 — DB-Backed Job Queue ✅

> No Redis/BullMQ. Uses a Postgres table + cron-job.org HTTP calls.

### New DB table (`schema.ts`)

```
background_jobs (
  id, workspaceId, 
  type: enum(sync_reviews | post_reply),
  status: enum(pending | running | done | failed),
  payload: text (JSON),
  attempts, maxAttempts,
  runAt, startedAt, finishedAt, lastError,
  createdAt
)
```

### Files created

| File | Purpose |
|------|---------|
| `src/lib/jobs/queue.ts` | `enqueueJob()`, `claimNextJob()`, `computeBackoff()` |
| `src/lib/jobs/worker.ts` | `runNextJob()` — dispatch loop |
| `src/lib/jobs/handlers/sync-reviews.ts` | Sync handler (no HTTP request) |
| `src/lib/jobs/handlers/post-reply.ts` | Post-reply handler (no HTTP request) |
| `src/app/api/cron/process-jobs/route.ts` | HTTP endpoint called by cron-job.org every 5 min |

### Refactors in `src/lib/google/business-profile.ts`

- Added `getGoogleAccessTokenForWorkspace(workspaceId)` — reads from `account` table, refreshes if expired
- Added `refreshGoogleAccessToken(userId, refreshToken)` — calls Google token endpoint, persists new token
- Extracted `syncWorkspaceReviewsFromAccessToken(workspaceId, token)` — actual sync logic, no headers needed
- Added `postGoogleReviewReplyWithToken(accessToken, reviewResourceName, content)` — takes token directly
- Existing HTTP-based functions delegate to these new token-based ones

### Backoff schedule

| Attempt | Delay |
|---------|-------|
| 1st retry | 30 seconds |
| 2nd retry | 2 minutes |
| 3rd retry | 8 minutes |
| After 3rd | status = `failed` permanently |

### cron-job.org setup (manual step)

- URL: `GET https://yourdomain.com/api/cron/process-jobs`
- Schedule: every 5 minutes (`*/5 * * * *`)
- Header: `Authorization: Bearer YOUR_CRON_SECRET`

---

## Gap 3 — Retry on Failed Posts ✅

**File modified:** `src/app/api/reviews/[id]/reply/post/route.ts`

- In the catch block: marks reply `failed`, then enqueues `post_reply` job with `runAt: computeBackoff(1)`, `maxAttempts: 3`
- Response includes `retrying: true`

**File modified:** `src/lib/reviews/server.ts`

- Added `markReplyFailed(replyId)` helper
- Updated `markReplyPosted` to accept `userId: string | null` (for system-originated retries)

---

## Gap 4 — Scheduled Auto-Sync ✅

**File created:** `src/app/api/cron/schedule-syncs/route.ts`

- Queries all workspaces with `businesses.status = "active"`
- For each: skips if a `sync_reviews` job is already pending, else enqueues one
- Returns `{ total, enqueued, skipped }`

### cron-job.org setup (manual step)

- URL: `GET https://yourdomain.com/api/cron/schedule-syncs`
- Schedule: every hour (`0 * * * *`)
- Header: `Authorization: Bearer YOUR_CRON_SECRET`

---

## Gap 5 — Reply Quality Analytics ✅

### New DB table (`schema.ts`)

```
reply_analytics_events (
  id, workspaceId, reviewId, replyId,
  eventType: enum(generated | edited | rejected | posted_direct | posted_edited),
  tone, wasEdited (bool), timeToPostMs (int), rating (int),
  createdAt
)
```

### Files created

| File | Purpose |
|------|---------|
| `src/lib/analytics/reply-events.ts` | `recordReplyEvent()` fire-and-forget helper |
| `src/app/api/analytics/reply-quality/route.ts` | `GET` endpoint — last 30 days stats |

### Routes instrumented (fire-and-forget, never blocks main flow)

| Route | Event emitted |
|-------|--------------|
| `generate/route.ts` | `generated` (with tone + star rating) |
| `post/route.ts` | `posted_direct` or `posted_edited` (compares content to detect edits, records `timeToPostMs`) |
| `dismiss/route.ts` | `rejected` |

---

## Gap 6 — Google Pub/Sub Webhook (Not started)

> Requires one-time GCP setup — deferred.

### New env vars needed
```
GOOGLE_PUBSUB_VERIFICATION_TOKEN=
```

### Files to create

| File | Purpose |
|------|---------|
| `src/app/api/webhooks/google-reviews/route.ts` | Receives Pub/Sub push, validates token, enqueues `sync_reviews` job |
| `src/app/api/google/register-notifications/route.ts` | One-time setup: registers a location for push notifications |

### GCP setup steps (one-time, manual)

1. Create a Cloud Pub/Sub topic in GCP console
2. Create a push subscription pointing to `https://yourdomain.com/api/webhooks/google-reviews?token=YOUR_TOKEN`
3. Call GMB Notifications API to register each business location:
   ```
   POST https://mybusiness.googleapis.com/v1/accounts/{accountId}/locations/{locationId}/notifications
   {
     "notificationTypes": ["NEW_REVIEW", "UPDATED_REVIEW"],
     "topicName": "projects/{gcp_project}/topics/{topic_name}"
   }
   ```

---

## DB Migration

Migration file: `drizzle/0003_background_jobs_and_analytics.sql`

Run via: `npm run db:migrate`

---

## Environment Variables to Add

```env
CRON_SECRET=your-secret-here   # shared secret for cron-job.org Authorization header
```

Add to Coolify environment variables and to cron-job.org as the Authorization header value.
