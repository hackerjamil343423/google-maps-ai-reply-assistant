# Plan 014: New-user product tour — per-page tips & spotlight highlights

Mission 3 of the 2026-07-12 UX revamp. After a new user signs up (and finishes the
existing `/onboarding` wizard), they land on the dashboard cold. This plan adds a
guided tour: a welcome dialog, then spotlight "coach marks" that highlight the key
control on each dashboard page (sidebar nav, business selector, review actions,
New Report button, review link, settings) with a short tip, step by step — the
pattern the user has seen in professional SaaS products.

## Status

DONE — implemented and verified on 2026-07-12. **Depends on plan 012 (hard)** for `Dialog`/`Button` and the `data-tour`
anchors it adds to DashboardShell, and **on plan 013 (soft)** for the
`data-tour="new-report-button"` anchor (the reports tour step lands after 013).

## Why this matters

- The product's core loop (connect business → sync reviews → approve AI replies →
  post) is invisible from the dashboard UI alone; new users must discover 6 pages
  by clicking around.
- There is already a *pre-dashboard* onboarding wizard (`src/app/onboarding`,
  gated by `userProfiles.onboardingCompleted`), but nothing teaches the dashboard
  itself. The tour is the missing second half.

## Current state

- `userProfiles` table (`src/lib/db/schema.ts` line ~117) has
  `onboardingCompleted boolean` — set by `POST /api/onboarding/complete`; checked
  in `src/app/dashboard/layout.tsx` (redirects incomplete users to `/onboarding`).
  There is **no storage for tour progress**.
- Dashboard pages all render inside `DashboardShell` (client component), which
  after plan 012 exposes `data-tour="sidebar-nav"`, `"workspace-selector"`,
  `"business-selector"` anchors.
- i18n: `useLanguage()` from `src/lib/i18n/language-context` gives `language`
  (`"en" | "ar"`); `dir` is set on `<html>`. Tour popovers must be bilingual and
  RTL-aware.
- No tour/JS-walkthrough dependency exists.

## Design decision: build a small in-house tour engine (no new dependency)

Considered `driver.js` (small, MIT) vs. custom. **Choose custom** because:
1. The codebase avoids UI deps except the Radix set from plan 012; a tour engine
   is ~200 lines on top of what we have.
2. Full control of RTL placement and brand styling (rounded-2xl, `#5F30EB`
   spotlight ring) without fighting a library's CSS.
3. Steps must be *route-aware* (tour continues across page navigations), which
   third-party libs handle awkwardly in App Router.

If the executor hits >1 day of positioning edge-case pain, STOP and propose
switching to `driver.js` instead of persisting.

## Architecture

### 1. Persistence

- Schema: add `toursCompleted jsonb NOT NULL DEFAULT '[]'` to `userProfiles`
  (array of tour ids, e.g. `["dashboard-welcome", "reviews", "reports"]`).
  Workflow: edit `src/lib/db/schema.ts` → `npm run db:generate` →
  `npm run db:push`.
- API: extend the existing `/api/me` GET to return `toursCompleted`, and add
  `POST /api/tours/complete` `{ tourId: string }` (Zod-validated against the
  known tour-id list; appends idempotently). Follow the standard route pattern
  from CLAUDE.md (getRequestSession → validate → update → respond).
- Client cache: also mirror completion in `localStorage`
  (`tour_completed_<id>`) so the tour never re-fires while a fetch is in flight,
  and works in demo mode (no db).

### 2. Tour engine — `src/components/tour/`

- `tour-provider.tsx` — `TourProvider` context mounted once inside
  `DashboardShell` (so every dashboard page gets it). Holds: active tour id,
  step index, completed set (from `/api/me`), `startTour(id)`, `next`, `prev`,
  `skip` (marks complete), `finish`.
- `tour-spotlight.tsx` — the overlay renderer:
  - Finds the current step's target via
    `document.querySelector('[data-tour="<key>"]')`.
  - Spotlight = fixed full-screen overlay using a huge `box-shadow` trick on a
    positioned cutout div (`box-shadow: 0 0 0 100vmax rgba(19,15,29,0.5)`,
    `border-radius: 16px`, 8px padding around `getBoundingClientRect()`), plus a
    `2px` `#5F30EB` ring. Re-measure on `resize`/`scroll` (rAF-throttled) and
    scroll the target into view (`scrollIntoView({block:"center"})`).
  - Popover card anchored beside the cutout: title, body, `Step i of n` pills,
    Back / Next / Skip tour buttons (plan 012 `Button`). Placement auto: prefer
    bottom, flip to top near viewport edge; horizontal placement flips with
    `dir`. Position with plain `position: fixed` + rect math (no Radix anchor
    needed).
  - If the target selector matches nothing (feature gated, empty state), skip
    that step silently.
- `steps.ts` — typed config, all copy in EN + AR:
  ```ts
  type TourStep = {
    target: string;            // data-tour key
    route?: string;            // navigate here before showing (router.push)
    title: { en: string; ar: string };
    body: { en: string; ar: string };
  };
  type Tour = { id: string; steps: TourStep[] };
  ```

### 3. Tours & content (initial set)

**Tour `dashboard-welcome`** — auto-starts once, on first dashboard visit after
signup. Begins with a welcome `Dialog` ("Welcome to Wakkelni Stars — take a
2-minute tour?" / "ابدأ الجولة" — buttons *Start tour* / *Skip for now*; both
mark the decision so it never re-prompts). Steps (each `route`-aware):

1. `sidebar-nav` — "Everything lives here: Dashboard, Reviews, AI Reports,
   Review Link, and Settings."
2. `business-selector` — "Switch between your connected business profiles; all
   pages filter to the one you pick." (Skipped automatically when only one
   business — the selector doesn't render.)
3. `/dashboard/reviews` `reviews-list` — "New Google reviews appear here after
   each sync. AI drafts a reply for every one."
4. `/dashboard/reviews` `review-actions` — "Approve, edit, or dismiss the AI
   reply — approved replies post straight to Google."
5. `/dashboard/reports` `new-report-button` — "Generate an AI analysis of your
   reviews, or compare businesses side by side."
6. `/dashboard/review-link` `review-link-card` — "Share this link or QR code to
   collect more 5-star reviews."
7. `/dashboard/settings` `ai-settings` — "Tune the AI's tone and switch between
   manual approval and auto-post."

Final step popover has a *Finish* button → `POST /api/tours/complete`.

Where `data-tour` anchors don't exist yet (`reviews-list`, `review-actions`,
`review-link-card`, `ai-settings`), add the attribute to the obvious container
element in those pages — attribute-only edits, no layout changes.

### 4. Triggers & replay

- Auto-start: in `TourProvider`, when `/api/me` says `onboardingCompleted &&
  !toursCompleted.includes("dashboard-welcome")` and localStorage agrees → show
  the welcome dialog. Never auto-start twice per session.
- Replay: add a small `?` help button at the bottom of the sidebar (next to the
  profile card) with `Tooltip` "Show tour" → `startTour("dashboard-welcome")`.
  This also makes the feature testable on existing accounts.
- Future per-feature tours (e.g. a "team" tour when Teams ships) reuse the same
  engine: add a `Tour` to `steps.ts` + one trigger.

## Commands you will need

```bash
npm run db:generate && npm run db:push   # toursCompleted column
npm run dev
npm run typecheck && npm run lint && npm test
```

## Scope

**In scope**: schema column + API, tour engine, `dashboard-welcome` tour content
(EN+AR), welcome dialog, replay button, `data-tour` attributes on target pages.

**Out of scope**: touching the existing `/onboarding` wizard; per-page separate
tours beyond the welcome tour; analytics events on tour progress (note as
follow-up); admin-configurable tour content.

## Git workflow

Branch `feat/product-tour` off `dev` (after 012, ideally after 013). Commits:
(1) schema+API, (2) engine, (3) content+anchors+triggers. PR into `dev`.

## Test plan

- Unit (vitest, follow `src/lib/__tests__` conventions): `POST /api/tours/complete`
  — rejects unknown tourId, appends once, idempotent on repeat.
- Manual:
  1. Fresh account → finish `/onboarding` → dashboard shows welcome dialog once.
     *Skip* → never reappears (reload to confirm; check row in db studio).
  2. *Start tour* → steps advance, cross-page steps navigate correctly, spotlight
     tracks targets on scroll/resize, missing targets are skipped (test with a
     one-business account: business-selector step skipped).
  3. Escape or *Skip tour* mid-way marks complete.
  4. Replay from the sidebar `?` button works after completion.
  5. Arabic: popover text in Arabic, placement mirrored, no overflow.
  6. Demo mode / db absent: no crash; tour state falls back to localStorage.
- `npm run typecheck`, `npm run lint`, `npm test` clean.

## Done criteria

- New users get exactly one welcome prompt; completing/skipping persists to
  `userProfiles.toursCompleted` and survives re-login on another device.
- Tour runs end-to-end in EN and AR, across route navigations, with no dead steps.
- No tour code loads for users who completed it beyond the initial `/api/me`
  read (the provider renders `null`; engine components are behind the active
  check — keep the overlay in a lazy `dynamic()` import if bundle size shows up).

## STOP conditions

- STOP if positioning/spotlight work exceeds ~a day of fiddling — propose
  `driver.js` with brand-themed CSS instead of sinking more time.
- STOP if `db:generate` produces a migration touching anything beyond the new
  column — schema drift; reconcile first.
- STOP before adding tour steps that require *creating* UI (e.g. highlighting a
  feature that has no stable element) — flag the gap instead.
