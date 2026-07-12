# Plan 007: Durable rate limiting for the unauthenticated money-spending endpoints

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ca8b8b1f..HEAD -- src/lib/api/rate-limit.ts src/app/api/generate-reply/route.ts src/app/api/public src/app/api/assistant/chat/route.ts src/lib/db/schema.ts`
> On any in-scope drift, compare the "Current state" excerpts against live code;
> on a mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (additive guard; worst regression is over-limiting the public demo)
- **Depends on**: none (005 recommended for the unit tests)
- **Category**: security
- **Planned at**: commit `ca8b8b1f`, 2026-07-02

## Why this matters

Three endpoints spend real money with **no auth and no rate limit**:

- `POST /api/generate-reply` — public demo; calls OpenAI with caller-controlled input (validated to ≤4000 chars, but unlimited call volume).
- `GET /api/public/business-search` — calls the paid Google Places `searchText` API.
- `GET /api/public/business-reviews` — calls the paid Google Places details API.

Any anonymous script can drive unbounded OpenAI/Places bills and exhaust quotas that real users need. The only limiter in the codebase (`src/lib/api/rate-limit.ts`) is a module-level in-memory `Map` — on Vercel, every serverless instance has its own map and cold starts reset it, so even the one endpoint that uses it (assistant chat) is only nominally protected. There is no `middleware.ts`; the fix is a shared, Postgres-backed limiter applied per-route.

## Current state

- `src/lib/api/rate-limit.ts` (45 lines, read in full) — `consumeRateLimit(key, maxRequests, windowMs)` over `const buckets = new Map<string, Bucket>()`; returns `{ allowed, remaining, resetAt }`.
- `src/app/api/assistant/chat/route.ts:157-169` — the only caller. IP extraction pattern used there (reuse it):

```ts
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rateKey = session ? `assistant:${session.user.id}` : `assistant:guest:${ip}`;
  const rate = consumeRateLimit(rateKey, 30, 5 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 }
    );
  }
```

- `src/app/api/generate-reply/route.ts` (39 lines, read in full) — Zod-validates the body, calls `generateReviewReply`, returns the reply. No session check (intentional — public demo), no limiter.
- `src/app/api/public/business-search/route.ts` and `business-reviews/route.ts` — validate query with Zod, check `env.GOOGLE_MAPS_API_KEY` (503 when missing), call fixed Places hosts with `encodeURIComponent`'d input (no SSRF), no limiter.
- `src/lib/db/schema.ts` — where the new table goes; `db` may be null (`@/lib/db` returns null without `DATABASE_URL`).

Conventions: 429 response shape as in the chat route above; Drizzle raw SQL via `db.execute(sql\`...\`)` is precedented in `src/lib/jobs/queue.ts:66-72`.

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Lint      | `npm run lint`         | exit 0              |
| Build     | `npm run typecheck`    | exit 0              |
| Migration | `npm run db:generate` then `npm run db:push` | exit 0 |
| Tests     | `npm test` (if plan 005 landed) | all pass   |

## Scope

**In scope**:
- `src/lib/api/rate-limit.ts` (extend — keep the in-memory function as fallback)
- `src/lib/api/client-ip.ts` (create — shared IP helper)
- `src/lib/db/schema.ts` (add `rateLimitBuckets` table) + generated migration
- `src/app/api/generate-reply/route.ts`
- `src/app/api/public/business-search/route.ts`
- `src/app/api/public/business-reviews/route.ts`
- `src/app/api/assistant/chat/route.ts` (switch to the durable limiter + shared IP helper)
- `src/lib/api/__tests__/rate-limit.test.ts` (create, if plan 005 landed)

**Out of scope**:
- `middleware.ts` — do not introduce one; per-route guards keep behavior explicit.
- Any external service (Upstash/Redis) — the decided store is the existing Postgres.
- CAPTCHA / bot-detection — deferred.
- `/api/i18n/translate` — verified disabled (returns 410) at planning time.

## Git workflow

- Branch: `advisor/007-rate-limiting` off `dev`
- Commit per step; short imperative sentences.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Durable limiter

1. Schema — add to `src/lib/db/schema.ts`:

```ts
export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});
```

`npm run db:generate` + `npm run db:push`.

2. In `src/lib/api/rate-limit.ts`, add `consumeRateLimitDurable(key, maxRequests, windowMs)` returning the same `{ allowed, remaining, resetAt }` shape. Implement as ONE atomic statement via `db.execute(sql\`...\`)` (single round trip, race-safe):

```sql
INSERT INTO rate_limit_buckets AS b (key, count, reset_at)
VALUES (${key}, 1, ${new Date(Date.now() + windowMs)})
ON CONFLICT (key) DO UPDATE SET
  count    = CASE WHEN b.reset_at <= now() THEN 1 ELSE b.count + 1 END,
  reset_at = CASE WHEN b.reset_at <= now() THEN ${new Date(Date.now() + windowMs)} ELSE b.reset_at END
RETURNING count, reset_at;
```

`allowed = count <= maxRequests`. **Fallback**: when `db` is null, delegate to the existing in-memory `consumeRateLimit` (demo mode keeps working). On query error, catch, log, and **allow** the request (availability over strictness for a demo surface) — but only after one attempt, no retries.

3. Create `src/lib/api/client-ip.ts` exporting `getClientIp(req: NextRequest): string` with the exact extraction logic quoted from the chat route above.

**Verify**: `npm run typecheck` → exit 0; migration contains `rate_limit_buckets`.

### Step 2: Guard the three public endpoints

Add at the top of each handler (after input validation so garbage doesn't consume quota):

- `generate-reply`: key `demo-reply:${ip}`, limit **5 per 10 minutes** and a second coarse bucket `demo-reply-day:${ip}` at **20 per 24h** (two `consumeRateLimitDurable` calls; reject if either disallows).
- `business-search`: key `places-search:${ip}`, **10 per minute**.
- `business-reviews`: key `places-reviews:${ip}`, **10 per minute**.

Rejection response matches the house shape: `NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 })`.

**Verify**: `npm run typecheck` → exit 0. Manual: `npm run dev`, hammer `POST /api/generate-reply` 6× with a valid body → 6th returns 429 (requires `DATABASE_URL`; without it the in-memory fallback still returns 429 within one dev process).

### Step 3: Move assistant chat to the durable limiter

In `src/app/api/assistant/chat/route.ts:157-169`, replace the ip extraction with `getClientIp(req)` and `consumeRateLimit` with `consumeRateLimitDurable` (same key, same 30/5min budget).

**Verify**: `grep -n "consumeRateLimitDurable" src/app/api/assistant/chat/route.ts` → 1 match; `npm run typecheck` → exit 0.

### Step 4: Tests (if plan 005 landed)

`src/lib/api/__tests__/rate-limit.test.ts`:
- in-memory `consumeRateLimit`: allows up to N, blocks N+1, resets after the window (use `vi.useFakeTimers()`);
- `consumeRateLimitDurable` with mocked `db.execute`: returns `allowed: false` when the returned `count` exceeds the max; falls back to in-memory when `db` is null; allows on query error.

**Verify**: `npm test` → all pass.

## Test plan

Step 4 above, plus the manual 429 smoke in Step 2. If plan 005 has not landed, the manual smoke is required, and note the missing unit tests in the completion report.

## Done criteria

- [ ] All three public endpoints return 429 under the configured thresholds (manual smoke observed)
- [ ] Limiter state lives in Postgres (`rate_limit_buckets` migration applied); in-memory path only used when `db` is null
- [ ] Assistant chat uses the durable limiter and the shared `getClientIp`
- [ ] `npm run lint`, `npm run typecheck` (+ `npm test` if present) exit 0
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Excerpts don't match live code (drift).
- The atomic upsert can't be expressed through `db.execute(sql...)` due to driver limitations — report the exact error; do not fall back to check-then-act (two statements) silently.
- `DATABASE_URL` unavailable for migration — implement with the in-memory fallback path verified, report migration blocked.
- Product owner input needed: if you believe the demo thresholds are too strict for a real marketing funnel, implement as specified and flag the numbers in the completion report — do not pick different numbers.

## Maintenance notes

- Buckets accrete one row per key; a follow-up cleanup (`DELETE FROM rate_limit_buckets WHERE reset_at < now() - interval '1 day'`) can piggyback on an existing cron. Deferred.
- Every new public endpoint must adopt this guard — reviewers should check for `consumeRateLimitDurable` in any future route without `getRequestSession`.
- `x-forwarded-for` is spoofable on non-proxied deployments; on Vercel it is set by the platform and trustworthy. If the app moves off Vercel, revisit `getClientIp`.
