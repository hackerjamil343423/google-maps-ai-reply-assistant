# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start Commands

**Development:**
```bash
npm run dev        # Start dev server (http://localhost:3000)
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run ESLint on the codebase
npm run typecheck  # TypeScript type checking (tsc --noEmit)
```

**Database:**
```bash
npm run db:generate   # Generate Drizzle migrations from schema changes
npm run db:push       # Apply migrations to database
npm run db:migrate    # Run migration files (alternative to push)
npm run db:studio     # Open Drizzle Studio (web UI for database at localhost:5555)
```

**Common Workflow:**
1. Make schema changes in `src/lib/db/schema.ts`
2. Run `npm run db:generate` to create migration
3. Run `npm run db:push` to apply to database
4. Run `npm run dev` to test locally

## Project Architecture

**Wakkelni Stars** (formerly Five Star Reply) is a SaaS for AI-powered Google Business Profile review management. Users connect their Google Business accounts, AI generates responses to reviews, and users approve/post replies.

### Core Stack
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 5
- **Auth:** better-auth with email/password + Google OAuth
- **Database:** Neon PostgreSQL + Drizzle ORM
- **AI:** OpenAI (gpt-4-mini, configurable via `OPENAI_MODEL` env var)
- **Styling:** Tailwind CSS v4 + PostCSS
- **Email:** Resend

### Key Environment Variables
```
DATABASE_URL              # Neon Postgres connection string
OPENAI_API_KEY            # OpenAI API key (optional, templates used as fallback)
OPENAI_MODEL              # Model override (default: gpt-4o-mini)
BETTER_AUTH_SECRET        # Session secret (min 32 chars)
BETTER_AUTH_URL           # App base URL for better-auth
NEXT_PUBLIC_APP_URL       # Public app URL
GOOGLE_CLIENT_ID          # Google OAuth credentials
GOOGLE_CLIENT_SECRET
GOOGLE_MAPS_API_KEY       # For Maps/Places API
RESEND_API_KEY            # Email service
RESEND_FROM_EMAIL         # Sender address
STRIPE_SECRET_KEY         # Stripe billing
STRIPE_WEBHOOK_SECRET     # Stripe webhook signature verification
CRON_SECRET               # Shared secret for cron endpoint auth
MINIMAX_API_KEY           # Optional: MiniMax AI model
```

## Codebase Structure

**`src/app/`** — Next.js App Router pages and API routes
- `dashboard/*` — Authenticated pages (reviews, team, analytics, settings)
- `api/*` — REST API endpoints
  - `api/auth/[...all]` — better-auth routes
  - `api/reviews/*` — Review CRUD and generation
  - `api/google/*` — Google Business Profile integration
  - `api/settings` — Workspace AI settings
  - `api/team/*` — Team member management
  - `api/subscription` — Billing
  - `api/cron/*` — Background job endpoints (process-jobs, schedule-syncs, subscription-expiry, trial-expiry)

**`src/components/`** — React components
- `dashboard/` — Dashboard-specific components
- `ui/` — Reusable UI components

**`src/lib/`** — Shared logic and utilities
- `db/` — Database client and schema definition
- `api/` — API helpers (session validation, error responses)
- `google/` — Google Business API client
- `ai/` — AI reply generation logic
- `reviews/` — Review processing logic
- `subscription/` — Subscription/billing logic
- `jobs/` — Background job queue
- `analytics/` — Analytics aggregation
- `i18n/` — Translation service
- `assistant/` — AI chat assistant

**`drizzle/`** — Generated Drizzle migrations (auto-generated, don't edit)

### Background Jobs
- `src/lib/jobs/queue.ts` — Job queue with neon serverless-compatible polling
- `src/lib/jobs/worker.ts` — Worker that processes queued jobs
- `src/lib/jobs/handlers/sync-reviews.ts` — Syncs reviews from Google API
- `src/lib/jobs/handlers/generate-reply.ts` — Generates AI reply; if `approvalMode === "auto"` in aiSettings, immediately posts to Google (else saves draft)
- `src/lib/jobs/handlers/post-reply.ts` — Posts an already-drafted reply to Google
- Pipeline: `sync-reviews` → enqueues `generate_reply` → optionally enqueues `post_reply`
- Cron endpoints hit `/api/cron/*` on an interval to trigger job enqueuing

### AI Assistant
- `src/lib/assistant/context.ts` — `buildAssistantContext()` queries workspace data for the assistant
- `src/lib/assistant/platform-knowledge.ts` — Platform knowledge base injected into the assistant prompt
- `src/lib/subscription/plans.ts` — Plan definitions, limits, and feature gates

## Architecture Patterns

### API Routes
All API routes follow this pattern:
```typescript
// 1. Import session helper
import { getRequestSession } from "@/lib/api/session";

// 2. Check auth
const session = await getRequestSession(req);
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// 3. Parse + validate input (Zod)
const parsed = someSchema.safeParse(payload);
if (!parsed.success) {
  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

// 4. Query/update database
const result = await db.query.table.findFirst({...});

// 5. Return response
return NextResponse.json({ data: result });
```

### Database Queries
- Use Drizzle query builder: `db.query.table.findFirst()`, `db.select()`, `db.insert()`, etc.
- Schema is defined in `src/lib/db/schema.ts` (export all tables for imports)
- Always handle case where `db` is undefined (graceful degradation for demo mode)

### Authentication
- Session is managed by better-auth (available at `req.auth` in middleware or via `getRequestSession()`)
- Protected pages use `canAccess()` helper to redirect unauthenticated users
- Session includes `user` object with `id`, `email`, `name`, and custom fields

### AI Reply Generation
- `src/lib/ai/` contains reply generation logic
- Falls back to templates if OpenAI API key is missing
- Configurable tone/style via workspace settings (`src/lib/db/schema.ts:aiSettings`)
- Product is **Wakkelni Stars** (not "Five Star Reply")

## Important Notes

**Database Nullability:**
- Use `.optional()` or `.nullable()` for optional database columns
- Always check database existence before querying (some endpoints work without database in demo mode)

**Assistant/Context:**
- `buildAssistantContext()` in `src/lib/assistant/context.ts` is the single entry point for assistant workspace data
- Returns `{ summary, history }` — summary is a newline-joined string of workspace facts, history is recent messages
- Uses `db.query.*.findFirst` with compound `where` clauses for data fetching

**Google Integration:**
- OAuth flow redirects to Google, returns auth token
- Stored in `googleAuths` table with refresh token for future syncs
- Reviews are synced from Google's API and stored locally in `reviews` table

**Session Duration:**
- Session tokens are server-managed by better-auth
- Set session expiry in better-auth config if needed

**Subscription/Billing:**
- Stripe Checkout + Customer Portal + webhooks are fully wired (`api/subscription/*`)
- Plans: `free`, `Local Business` (149/mo), `Multi-Location` (349/mo), `Agency Max` (999/mo); defined in `src/lib/subscription/plans.ts`
- Stripe Price IDs are bootstrapped once via `scripts/stripe-bootstrap.ts` and stored in `platformSettings` under key `billing.stripe_price_ids.v1`
- `src/lib/subscription/pricing.ts` — dynamic pricing layer; reads overrides from `platformSettings`, falls back to hardcoded defaults
- `src/lib/stripe/client.ts` — Stripe SDK singleton + `getOrCreateStripeCustomer()`

## Testing & Validation

- Use Zod for all request validation (schemas defined near route handlers)
- Run `npm run typecheck` to catch TypeScript errors before pushing
- Run `npm run lint` for code quality checks
- Database changes via `npm run db:push` should be tested locally with `npm run dev`

## Deployment

- Deployed to Vercel (Next.js native)
- Environment variables set in Vercel project settings
- Database migrations auto-run before deployment (configure in build command if needed)
- Security headers configured in `next.config.ts` (X-Frame-Options, CSP-like headers)
