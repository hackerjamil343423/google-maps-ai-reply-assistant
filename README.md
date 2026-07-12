# Wakkelni Stars

Wakkelni Stars is an AI-powered Google Business Profile review management SaaS for the KSA market. Businesses connect Google profiles, sync reviews, generate AI replies, and post replies back to Google.

This repo contains two Next.js apps:

- Root app: main product, runs on port 3000.
- `saas-admin/`: platform admin panel, runs on port 3001 and has its own `package.json`.

## Prerequisites

- Node.js 20+
- Neon Postgres `DATABASE_URL`
- Google OAuth and Places API credentials
- OpenAI API key for generated replies
- Stripe keys and webhook secret for billing
- `CRON_SECRET` for `/api/cron/*` endpoints

Copy `.env.example` to `.env` and fill the required values.

## Setup

```bash
npm install
npm run db:push
npm run dev
```

Open `http://localhost:3000`.

For the admin app:

```bash
cd saas-admin
npm install
npm run dev
```

Open `http://localhost:3001`.

## Stripe

Stripe price IDs are bootstrapped with `scripts/stripe-bootstrap.ts` and stored in `platformSettings`. For local webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/subscription/webhook
```

Copy the printed `whsec_...` value to `STRIPE_WEBHOOK_SECRET`.

## Background Jobs

Cron routes live under `/api/cron/*` and require:

```text
Authorization: Bearer $CRON_SECRET
```

Missing `CRON_SECRET` is treated as unauthorized.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the main app locally |
| `npm run build` | Production Next.js build |
| `npm run start` | Start the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm test` | Run Vitest unit tests |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push` | Push schema changes to Postgres |
| `npm run db:studio` | Open Drizzle Studio |

See `CLAUDE.md` for architecture details and `plans/README.md` for the improvement backlog.
