# Wakkelni Stars (formerly Five Star Reply) - Project Documentation

## What This Project Is

Wakkelni Stars is an AI-powered SaaS that helps businesses manage and respond to Google Business Profile reviews using AI.

Primary users:
- Local businesses that want faster review response and better local SEO.
- Agencies that manage multiple client profiles.

## Routes

### Public
| Route | Description |
|---|---|
| `/` | Landing page |
| `/demo` | Public reply generation demo |
| `/pricing` | Pricing and FAQ |
| `/GetStarted` | Login/signup page |
| `/profile` | User profile page |

### Dashboard
| Route | Description |
|---|---|
| `/dashboard` | Google connection status + connect/sync flow |
| `/dashboard/overview` | Reviews overview + reply actions |
| `/dashboard/reviews` | Status tabs, bulk approve, dismiss |
| `/dashboard/analytics` | Analytics based on real review data |
| `/dashboard/team` | Team member and invitation management |
| `/dashboard/subscription` | Subscription and plan management |
| `/dashboard/settings` | AI prompt/tone/approval settings |

## Backend Implementation Status

### Completed
- Better Auth integration with email/password and Google OAuth.
- Route protection for dashboard/profile/auth flow redirects.
- Neon Postgres + Drizzle ORM wiring.
- Production tables for auth, workspaces, members, businesses, reviews, replies, settings, invitations, subscriptions, jobs, analytics, and admin/blog data.
- Google Business Profile integration for connect, sync, and reply posting.
- OpenAI reply generation with template fallback when OpenAI is unavailable.
- Stripe checkout and live webhook billing flow.
- Dashboard pages backed by real APIs.
- Env validation with Zod.

### Pending / In Progress
- Email invite acceptance by token link.
- Full audit log coverage.
- Continued endpoint-level rate-limit coverage and billing webhook hardening.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript 5
- better-auth
- Neon Postgres
- drizzle-orm / drizzle-kit
- OpenAI
- Stripe
- Resend
- Tailwind CSS v4

## Architecture Notes

- The root app is the main product.
- `saas-admin/` is a separate admin app with its own package and build.
- Data persistence is live on Neon for core product flows.
- Google OAuth + Google Business review sync/posting are implemented.
- Billing is Stripe-based. Plan 006 tracks additional webhook correctness hardening.
- AI uses OpenAI when available and falls back to templates if the API key is missing.

## Pricing

Pricing source of truth: `src/lib/subscription/plans.ts` for defaults plus `platformSettings` overrides managed through `saas-admin`.

As of 2026-07, default monthly prices are SAR 149, SAR 349, and SAR 999 for Local Business, Multi-Location, and Agency Max.
