# Five Star Reply - Project Documentation

## What This Project Is
Five Star Reply is an AI-powered SaaS that helps businesses manage and respond to Google Business Profile reviews using AI.

Primary users:
- Local businesses that want faster review response and better local SEO.
- Agencies that manage multiple client profiles.

---

## Routes

### Public
| Route | Description |
|---|---|
| `/` | Landing page |
| `/demo` | Public reply generation demo |
| `/pricing` | Pricing and FAQ |
| `/GetStarted` | Login/signup page |
| `/profile` | User profile page |

### Dashboard (Authenticated)
| Route | Description |
|---|---|
| `/dashboard` | Google connection status + connect/sync flow |
| `/dashboard/overview` | Reviews overview + reply actions |
| `/dashboard/reviews` | Status tabs, bulk approve, dismiss |
| `/dashboard/analytics` | Analytics based on real review data |
| `/dashboard/team` | Team member and invitation management |
| `/dashboard/subscription` | Subscription data and plan change simulation |
| `/dashboard/settings` | AI prompt/tone/approval settings |

---

## API Routes
| Route | Description |
|---|---|
| `/api/auth/[...all]` | Better Auth endpoints (session, sign in/out, social auth) |
| `/api/me` | GET/PATCH user profile |
| `/api/me/change-password` | POST password change |
| `/api/settings` | GET/PUT workspace AI settings |
| `/api/team/members` | GET/DELETE members |
| `/api/team/members/role` | PATCH member role |
| `/api/team/invitations` | POST invitation |
| `/api/subscription` | GET/PATCH subscription persistence |
| `/api/google/status` | GET Google integration status |
| `/api/google/connect` | POST connect Google Business location |
| `/api/google/sync-reviews` | POST sync Google reviews |
| `/api/reviews` | GET reviews list with filtering/pagination |
| `/api/reviews/[id]/reply/generate` | POST generate AI reply |
| `/api/reviews/[id]/reply/save` | POST save reply |
| `/api/reviews/[id]/reply/post` | POST post reply to Google |
| `/api/reviews/[id]/dismiss` | POST dismiss review |
| `/api/reviews/bulk/approve` | POST bulk approve/post |
| `/api/generate-reply` | POST standalone AI endpoint (OpenAI-first with fallback) |

---

## Backend Implementation Status (2026-02-27)

### Completed
- [x] Better Auth integration (email/password + Google OAuth)
- [x] Route protection for dashboard/profile/auth flow redirects
- [x] Neon Postgres + Drizzle ORM wiring
- [x] Production tables for auth, workspaces, members, businesses, reviews, replies, settings, invitations, subscriptions
- [x] Google Business Profile integration (connect, sync, post replies)
- [x] OpenAI integration for reply generation
- [x] Template fallback when OpenAI key is missing
- [x] Dashboard pages switched from mock data to backend APIs
- [x] Settings/profile/team/subscription persistence
- [x] Env validation with Zod

### Pending
- [ ] Stripe checkout + live webhook billing flow
- [ ] Email invite acceptance by token link
- [ ] Full audit log coverage and endpoint-level rate limiting

---

## Tech Stack

### Framework
- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Node.js runtime

### Auth
- better-auth

### Database
- Neon Postgres
- drizzle-orm
- drizzle-kit
- @neondatabase/serverless

### AI
- openai (default model: `gpt-4.1-mini`, configurable with `OPENAI_MODEL`)

### Frontend
- Tailwind CSS v4
- PostCSS

---

## Key Dependencies
```json
{
  "next": "16.1.6",
  "react": "19.2.3",
  "react-dom": "19.2.3",
  "better-auth": "installed",
  "drizzle-orm": "installed",
  "drizzle-kit": "installed",
  "@neondatabase/serverless": "installed",
  "openai": "installed",
  "zod": "installed",
  "tailwindcss": "^4",
  "@tailwindcss/postcss": "^4",
  "typescript": "^5"
}
```

---

## Architecture Notes
- Auth is live with Better Auth and server-side session checks.
- Data persistence is live on Neon for core product flows.
- Google OAuth + Google Business review sync/posting are implemented.
- AI uses OpenAI when available, and falls back to templates if API key is missing.
- Billing UI is connected to backend persistence, but live Stripe checkout/webhooks are still pending.

---

## Business Model
| Plan | Price | Profiles |
|---|---|---|
| Local Business | $15/mo | 1 Google Business Profile |
| Multi-Location | $49/mo | Up to 5 profiles |
| Agency Max | $199/mo | Up to 60 profiles |
