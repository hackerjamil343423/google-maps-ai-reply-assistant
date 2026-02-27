# Backend + Production Plan (Better Auth + Neon + OpenAI)

## 1) Goal
Ship the current frontend-only MVP as a production-ready SaaS with:
- Real authentication (`better-auth`)
- Real database (`Neon Postgres`)
- Real AI reply generation (`OpenAI`)
- Secure, observable, testable backend APIs

This plan is scoped to the current Next.js App Router codebase in this repository.

---

## 2) Current State (From `PROJECT.md` + code)
- UI is mostly complete across landing, auth, dashboard, profile, team, settings, subscription.
- Core API exists: `/api/generate-reply` with template logic only.
- No real auth backend (`/GetStarted` is mock).
- No database persistence (reviews/team/settings/subscription are mock state).
- No role-based access control.
- No production runtime safeguards (rate limiting, audit logs, monitoring, etc.).

---

## 3) Target Architecture
- App: Next.js App Router (server-first for data reads/writes)
- Auth: `better-auth` with email/password + Google OAuth
- DB: Neon Postgres + Drizzle ORM + Drizzle migrations
- AI: OpenAI API (`gpt-4.1-mini` by default, configurable)
- Validation: `zod` on all request bodies and query params
- Authorization: workspace/business scoped RBAC (Owner, Manager, Editor, Viewer)
- Background jobs: start with cron/polling for review sync, then move to queue worker if load grows
- Billing: Stripe (subscription page backend-ready, even if Stripe integration is phase 2)

---

## 4) Data Model (Neon)
Use a workspace model so agencies can manage multiple businesses.

### Core auth tables
- `users`
- `sessions`
- `accounts` (OAuth providers)
- `verifications`

These are created using Better Auth schema/migrations.

### Product tables
- `workspaces`
  - `id`, `name`, `owner_user_id`, `created_at`
- `workspace_members`
  - `workspace_id`, `user_id`, `role` (`owner|manager|editor|viewer`), `created_at`
- `businesses`
  - `id`, `workspace_id`, `google_location_id`, `name`, `connected_at`, `status`
- `reviews`
  - `id`, `business_id`, `google_review_id`, `author_name`, `rating`, `text`, `reviewed_at`, `synced_at`
- `review_replies`
  - `id`, `review_id`, `content`, `source` (`ai|manual`), `status` (`draft|approved|posted|failed`), `posted_at`, `created_by`
- `ai_settings`
  - `workspace_id`, `prompt`, `tone`, `approval_mode` (`auto|review`)
- `team_invitations`
  - `id`, `workspace_id`, `email`, `role`, `token`, `expires_at`, `accepted_at`, `invited_by`
- `subscriptions`
  - `workspace_id`, `plan`, `status`, `stripe_customer_id`, `stripe_subscription_id`, `trial_ends_at`, `current_period_end`
- `usage_counters`
  - `workspace_id`, `month`, `reviews_managed`, `ai_replies_generated`
- `audit_logs`
  - `workspace_id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `meta_json`, `created_at`

---

## 5) API Contracts (Map Existing UI -> Backend)

### Auth
- `POST /api/auth/sign-up` (Better Auth handler)
- `POST /api/auth/sign-in`
- `POST /api/auth/sign-out`
- `GET /api/auth/session`
- `GET /api/auth/google` (OAuth start/callback)

### Profile
- `GET /api/me`
- `PATCH /api/me`
- `POST /api/me/change-password`
- `DELETE /api/me`

### Settings
- `GET /api/settings`
- `PUT /api/settings`

### Reviews
- `GET /api/reviews?status=&search=&rating_lte=&sort=&page=`
- `POST /api/reviews/:id/reply/generate`
- `POST /api/reviews/:id/reply/save`
- `POST /api/reviews/:id/reply/post`
- `POST /api/reviews/bulk/approve`
- `POST /api/reviews/:id/dismiss`

### Team
- `GET /api/team/members`
- `POST /api/team/invitations`
- `PATCH /api/team/members/:id/role`
- `DELETE /api/team/members/:id`

### Subscription
- `GET /api/subscription`
- `POST /api/subscription/checkout` (Stripe)
- `POST /api/webhooks/stripe`

### Google Business Profile (connect + sync)
- `GET /api/google/connect`
- `GET /api/google/callback`
- `POST /api/google/sync-reviews`

---

## 6) OpenAI Integration Plan
- Replace template logic in `/api/generate-reply` with service layer:
  - `generateReply({ reviewText, reviewerName, rating, tone, customPrompt, businessName })`
- Build prompt from saved workspace settings (`ai_settings`).
- Safety rules:
  - Max input size, output size, profanity/hate guardrails, retry policy.
- Store output in `review_replies` (`source=ai`, `status=draft` or `approved` depending on setting).
- Add rate limits:
  - Per-user and per-workspace request limits.
- Add idempotency key for repeated generate clicks.

---

## 7) Security + Production Hardening
- Server-side session checks for all dashboard APIs/pages.
- RBAC guard per route (`owner/manager/editor/viewer`).
- Zod validation for every input.
- HTTP security headers in `next.config.ts`.
- Rate limiting for auth and AI endpoints.
- SQL safety via ORM query builder only.
- Audit logging for role changes, settings updates, invite actions, reply posting.
- Secrets in environment variables only (never in client bundle).

---

## 8) Observability + Quality Gates
- Structured logging with request id.
- Error monitoring (Sentry or equivalent).
- Basic metrics:
  - API latency, error rate, OpenAI token usage, sync job failures.
- Testing:
  - Unit tests for prompt builder, permission checks, validators.
  - Integration tests for auth + review endpoints.
  - Smoke E2E for sign up, generate reply, approve/post, invite member.
- CI pipeline:
  - Typecheck, lint, tests, migration check before deploy.

---

## 9) Implementation Phases

### Phase 1: Foundation (Day 1-2)
- Add env management (`.env.example`) and config module.
- Install/setup:
  - `better-auth`, `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`, `zod`, `openai`
- Create DB connection and migration flow.
- Add base server utilities (`auth`, `db`, `api error`, `validation`).

### Phase 2: Auth + Access Control (Day 3-4)
- Integrate Better Auth (email/password + Google).
- Protect dashboard routes with session middleware/pattern.
- Add workspace bootstrap on signup.
- Add RBAC utilities and enforce on team/review/settings endpoints.

### Phase 3: Data Persistence for Existing Screens (Day 5-7)
- Replace mock state in:
  - `/GetStarted`
  - `/profile`
  - `/dashboard/settings`
  - `/dashboard/reviews`
  - `/dashboard/overview`
  - `/dashboard/team`
  - `/dashboard/subscription`
- Implement corresponding API routes and server actions.

### Phase 4: OpenAI Production Reply Engine (Day 8-9)
- Move `/api/generate-reply` to real OpenAI service.
- Add per-workspace prompt/tone injection.
- Persist generations and statuses.
- Add fallback response policy when OpenAI fails.

### Phase 5: Google Business Sync + Posting (Day 10-12)
- OAuth scopes + token storage.
- Pull real reviews into `reviews`.
- Post approved replies to Google Business API.
- Add sync schedule + manual sync endpoint.

### Phase 6: Billing + Launch Readiness (Day 13-14)
- Stripe checkout + webhook handling + plan enforcement.
- Usage metering and hard limits by plan.
- Observability, test hardening, and deployment checklist.

---

## 10) Environment Variables
Add and document:
- `DATABASE_URL` (Neon pooled URL)
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default `gpt-4.1-mini`)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`

---

## 11) Definition of Done (Production-Ready)
- Users can sign up/sign in/sign out and recover sessions.
- All dashboard screens read/write real Neon data.
- AI generation uses OpenAI and respects workspace settings.
- Team roles are enforced server-side.
- Review approval/posting flow works end-to-end.
- Rate limits + validation + audit logs are active.
- CI passes and zero critical Sentry errors in staging.
- Production deploy with rollback plan documented.

---

## 12) First Build Order (Immediate Next Tasks)
1. Set up Drizzle + Neon connection and run first migration.
2. Integrate Better Auth routes and wire `/GetStarted` to real sign-in/sign-up.
3. Create `workspaces`, `workspace_members`, `ai_settings` tables and bootstrap logic.
4. Convert `/dashboard/settings` and `/profile` from mock to persisted APIs.
5. Replace `/api/generate-reply` template engine with OpenAI service.
