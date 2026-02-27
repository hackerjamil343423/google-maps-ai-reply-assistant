# Five Star Reply — Project Documentation

## What Is This Project?

**Five Star Reply** is an AI-powered SaaS platform that helps businesses automatically generate and manage responses to their Google Business Profile reviews. The core idea is simple: responding to Google reviews boosts local SEO rankings, builds customer trust, and turns feedback into repeat business — but most business owners never find the time to do it consistently. Five Star Reply solves this by letting an AI reply on their behalf, in their brand voice, 24/7.

The product targets two audiences:
- **Local businesses** (restaurants, salons, plumbers, dentists, etc.) who want to save time and rank higher on Google Maps
- **Marketing agencies** who manage multiple client profiles and want a white-label automation tool to resell

---

## Pages & Features

### Public Pages
| Route | Description |
|---|---|
| `/` | Landing page — hero with live business search demo, Why Your Business Needs This, Cost of Silence, Customers We Serve, How It Works, Join Us CTA, Pricing preview, Footer |
| `/demo` | Interactive demo — paste any review, select star rating + reviewer name, AI generates a reply live via `/api/generate-reply` |
| `/pricing` | Pricing page — 3 plan cards (Local Business $15 / Multi-Location $49 / Agency Max $199), FAQ accordion |
| `/GetStarted` | Auth page — handles both Login and Signup modes via `?mode=login` / `?mode=signup` query param, Google OAuth button, show/hide password toggle |
| `/profile` | User profile page — personal info form (name, email, phone, company, website, bio), change password with strength meter + match indicator, danger zone (delete account) |

### Dashboard (authenticated app)
| Route | Description |
|---|---|
| `/dashboard` | API / Connect page — connect Google Business Profile, onboarding 3-step cards |
| `/profile` | Accessible from the avatar dropdown in every dashboard page |
| `/dashboard/overview` | Reviews overview — stat cards, search + star filter + sort, paginated review cards with inline AI reply, approve/edit/copy actions |
| `/dashboard/reviews` | Status-filtered reviews — Pending approval / Auto posted / Replied Manually tabs with live counts, approve-all, dismiss |
| `/dashboard/analytics` | Analytics — animated stat counters, SVG line chart (Impact on Business), average rating stars, response rate radial chart, monthly bar chart, rating distribution bars |
| `/dashboard/team` | Team management — invite form (email + business + role), members list with inline role change and remove |
| `/dashboard/subscription` | Subscription — current plan info, trial banner, usage progress bar, upgrade plan cards |
| `/dashboard/settings` | Settings — AI prompt textarea, tone style selector (8 options + chip pills), post approval radio (Auto Post / Review before publish), save with success feedback |

### API Routes
| Route | Description |
|---|---|
| `/api/generate-reply` | POST — accepts `{ review, reviewerName, starRating }`, returns `{ reply }`. Currently uses a smart template engine (positive/neutral/negative tone detection, topic detection). Stub-ready to swap for any AI provider (Anthropic, OpenAI, etc.) |

---

## Tech Stack

### Framework & Runtime
- **Next.js 16** (App Router, Turbopack) — React 19, TypeScript 5
- **Node.js** — server runtime

### Styling
- **Tailwind CSS v4** — utility-first CSS with custom design tokens
- **PostCSS** — Tailwind processing pipeline

### UI & Components
- All components are custom-built — no component library dependency
- **Shared layout**: `DashboardShell` component wraps all dashboard pages (sidebar, mobile drawer, top header, profile dropdown)
- **SVG charts**: hand-rolled SVG line chart, bar chart, radial progress, rating distribution — no chart library needed
- Inline SVG icons (Lucide-style paths) — no icon package dependency

### Design System
| Token | Value |
|---|---|
| Background | `#0B090A` (near-black) |
| Primary accent | `#00FFE9` (teal/cyan) |
| Text primary | `#C3C3C3` |
| Glass cards | `bg-[#0B090A33]` + `backdrop-blur` + inset shadow |
| Border | `rgba(255,255,255,0.15–0.33)` |
| Danger | `#FF4E4E` |
| Font | Geist (system), Arial fallback |

### Project Structure
```
src/
├── app/
│   ├── layout.tsx              # Root layout (Geist font, dark theme)
│   ├── globals.css             # Tailwind + CSS variables
│   ├── page.tsx                # Home / landing page
│   ├── demo/page.tsx           # Public demo page
│   ├── pricing/page.tsx        # Pricing + FAQ
│   ├── GetStarted/page.tsx     # Login / Signup
│   ├── profile/page.tsx        # User profile + change password
│   ├── api/
│   │   └── generate-reply/
│   │       └── route.ts        # AI reply generation API
│   └── dashboard/
│       ├── page.tsx            # Connect Google Business Profile
│       ├── overview/page.tsx   # Reviews overview
│       ├── reviews/page.tsx    # Status-filtered reviews
│       ├── analytics/page.tsx  # Analytics + charts
│       ├── team/page.tsx       # Team management
│       ├── subscription/page.tsx # Subscription management
│       └── settings/page.tsx   # AI prompt + tone + approval settings
└── components/
    └── DashboardShell.tsx      # Shared dashboard layout (sidebar + header + profile dropdown)
```

### Key Dependencies
```json
{
  "next": "16.1.6",
  "react": "19.2.3",
  "react-dom": "19.2.3",
  "tailwindcss": "^4",
  "@tailwindcss/postcss": "^4",
  "typescript": "^5"
}
```

---

## Architecture Notes

- **No auth library yet** — `/GetStarted` is UI-only; connect to NextAuth, Supabase Auth, or a custom JWT backend
- **No database yet** — all review/team/subscription data is mock state; connect to Prisma + PostgreSQL or Supabase
- **No real AI yet** — `/api/generate-reply` uses a template engine; swap `buildTemplateReply()` for an Anthropic or OpenAI SDK call
- **No Google OAuth yet** — the "Continue with Gmail" button points to `/api/auth/google`; implement with Google OAuth 2.0
- **No Google Business Profile API yet** — the "Connect Business Profile" flow is UI-only; integrate with Google My Business API

---

## Business Model

| Plan | Price | Profiles |
|---|---|---|
| Local Business | $15/mo | 1 Google Business Profile |
| Multi-Location | $49/mo | Up to 5 profiles |
| Agency Max | $199/mo | Up to 60 profiles |

All plans include: Auto-Reply, Auto-Post or Manual Approval, Customizable AI Prompt, Tone Control, Star-Based Review Filtering, Bulk Reply Management, AI Rewrite Assistant.
