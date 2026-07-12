# Plan 013: Reports page — replace the always-visible builder with a "New Report" step-by-step wizard dialog

Mission 1 of the 2026-07-12 UX revamp. The reports page currently front-loads every
decision (mode tabs, business picker, period, language, generate button) into one
dense card the user must parse before doing anything. This plan replaces all of it
with a single **New Report** button that opens a guided multi-step dialog, and
promotes **Report History** to be the page's main content.

## Status

DONE — implemented and verified on 2026-07-12. **Depends on plan 012 (hard)**: uses `Dialog`, `Button`, `Skeleton`,
`Badge` from `src/components/ui/` and the semantic theme tokens.

## Why this matters

User's own words: "when I [open] the analysis I see a lot of details in the front,
so I can't easily understand the UI." The current page shows ~6 controls and 3
conditional warning messages before the user has expressed any intent. A wizard
turns that into one decision per screen, with validation explained in context.

## Current state

All in `src/components/dashboard/analytics/reports/ReportsPageClient.tsx` (905
lines, one component):

- **Header row** (lines 428-462): title + `Single business / Compare businesses`
  tab toggle (`reportMode` state).
- **Builder card** (lines 464-748): business list (radio-style buttons for single
  mode, 2-3 multi-select for comparison), period `<select>` (`all_time` |
  `this_month`), language toggle (`en` | `ar`), generate button, inline
  error/info/success messages.
- **Inline latest-report render** (lines 750-790): after generation the full
  `ReportCard` / `ComparisonReportCard` renders on the page.
- **Report History card** (lines 792-900): merged single+comparison list sorted by
  date; rows navigate to detail pages.
- Data/logic worth keeping verbatim:
  - Fetches: `/api/analytics/businesses`, `/api/analytics/reports/url/history`,
    `/api/analytics/comparison-reports/history`.
  - Generation: `POST /api/analytics/reports/url` `{ businessId, period, language }`;
    `POST /api/analytics/comparison-reports` `{ businessIds, period, language }`.
    Both return 422 with `message` when a business has no reviews in the period.
  - Validation rules: single needs 1 business with `syncedReviewCount >= 1`;
    comparison needs 2-3 businesses, each with `syncedReviewCount >= 1`.
  - `activeBusiness` from `useBusinessContext()` scopes the single-mode business
    list and filters history.
- Detail routes already exist: `/dashboard/reports/[reportId]` and
  `/dashboard/reports/comparisons/[reportId]`.
- Reusable wizard primitives already exist in `src/components/ui/onboarding.tsx`:
  `Onboarding` (step state machine with `canGoNext`), `Onboarding.StepIndicator`
  (pills variant), `ChoiceGroup` (brand-styled radio cards). Reuse the *patterns*;
  the dialog wizard gets its own lightweight stepper (the Onboarding root's
  `stepValue` sub-step logic is more than we need).

## Commands you will need

```bash
npm run dev          # manual verification at /dashboard/reports
npm run typecheck && npm run lint
```

## Scope

**In scope**
1. New `NewReportWizard` dialog component (steps, validation, generation calls).
2. Rewrite `ReportsPageClient` page body: header + New Report button + history.
3. Remove: mode tabs, builder card, inline latest-report block.
4. After successful generation: navigate to the report's detail page.

**Out of scope**
- Any API/backend change. Both generation endpoints are used as-is.
- `ReportCard` / `ComparisonReportCard` internals (still used by detail pages).
- New periods, languages, or report types (the wizard must make adding them easy,
  not add them).
- History pagination/filtering (note as follow-up only).

## Git workflow

Branch `feat/reports-wizard` off `dev` (after plan 012 is merged). PR into `dev`.

## Target UX

### Page (after)

```
AI Reviews Analysis                                [ + New Report ]

┌─ Report History ────────────────────────────────────────────────┐
│  (same merged list as today, now the hero of the page;          │
│   Comparison rows keep their badge)                              │
│                                                                  │
│  Empty state: icon + "No reports yet" + [Generate your first    │
│  report] button that opens the wizard                            │
└──────────────────────────────────────────────────────────────────┘
```

### Wizard steps

Header shows title + step pills (reuse the `StepIndicator` pills pattern).
Footer: `Back` (ghost) / `Next` (primary), swapping to `Generate Report` on the
last step. `Next` is disabled until the step is valid, with a one-line hint
explaining why ("Select one more business to compare").

- **Step 1 — Report type.** Two large choice cards (ChoiceGroup pattern):
  *Single business* ("Deep-dive into one business's reviews") and
  *Compare businesses* ("Side-by-side analysis of 2-3 businesses"). Comparison
  card is disabled with hint "Connect at least 2 businesses" when
  `businesses.length < 2`. Switching type resets step-2 selection.
- **Step 2 — Choose business(es).** Single: radio card list (initial-letter
  avatar, name, `N synced reviews`), preselected from `activeBusiness` when set.
  Comparison: checkbox cards with a `n/3 selected` counter; 4th selection blocked.
  In BOTH modes, businesses with `syncedReviewCount === 0` render disabled with
  "No synced reviews yet" — this replaces today's post-hoc warnings by making the
  invalid choice impossible.
  **Skip rule:** if type=single and exactly one eligible business exists,
  auto-select it and skip straight to step 3 (Back returns to step 1).
- **Step 3 — Settings.** Period as two choice cards (This Month / All Time,
  default This Month) and report language as the existing EN/AR toggle pair.
- **Step 4 — Review & generate.** Summary rows (Type, Business(es), Period,
  Language) each with an "Edit" link jumping to that step. Primary button
  `Generate Report` → spinner state "Analyzing reviews… this can take up to a
  minute" with all navigation disabled while in flight.
  - Success → close dialog, `router.push` to the new detail page
    (`/dashboard/reports/{id}` or `/dashboard/reports/comparisons/{id}`), and
    prepend the summary to the history list state so Back-navigation shows it.
  - 422 → show the API `message` inline on step 4 (info tone, not error).
  - Other errors → inline error with a Retry that re-submits.

### Empty/edge states

- No connected businesses at all: clicking New Report opens the dialog showing a
  single connect CTA (icon, "Connect your Google Business to generate reports",
  button → `/dashboard/settings`) instead of step 1.
- Closing the dialog (X, overlay, Escape) fully resets wizard state, EXCEPT while
  generation is in flight — then block close (Radix `onInteractOutside` /
  `onEscapeKeyDown` preventDefault) so users don't lose an in-progress generation.

## Steps

### Step 1: Build `NewReportWizard`

New file `src/components/dashboard/analytics/reports/NewReportWizard.tsx`:

- Props: `open`, `onOpenChange`, `businesses: ConnectedBusiness[]`,
  `activeBusinessId?: string`,
  `onReportCreated(item: HistoryItem, detailHref: string): void`.
- Internal state: `step (1-4)`, `reportType`, `selectedBusinessIds: string[]`
  (length 1 in single mode), `period`, `language`, `generating`, `error`, `info`.
- Move `handleGenerateReport` + `handleGenerateComparison` bodies here (they only
  need fetch + the state above). Keep request/response typing
  (`ComparisonGenerateResponse`) as-is.
- Built on plan 012's `Dialog` (`DialogContent` ~`sm:max-w-xl`), `Button`, and the
  choice-card styling copied from `ChoiceGroup.Item` in
  `src/components/ui/onboarding.tsx` (don't import Onboarding's root — its
  step machine assumes full-page flow).
- Per-step `canGoNext`: step1 `reportType != null`; step2 single
  `selectedBusinessIds.length === 1`, comparison `2-3`; step3 always (defaults);
  step4 n/a (Generate replaces Next).
- Reset all state in a `useEffect` on `open` becoming true (not on close, to
  avoid content flashing during the close animation).

### Step 2: Slim down `ReportsPageClient`

- Keep: the three fetch effects, `historyItems` merge/sort, `activeBusiness`
  filtering of history, `handleViewReport`/`handleViewComparison`.
- Delete: `reportMode`, `selectedBusiness`, `selectedBusinessIds`,
  `selectedPeriod`, `reportLanguage`, `selectedReport`,
  `selectedComparisonReport`, all generate handlers, `toggleComparisonBusiness`,
  `clearMessages`, the tabs, the builder card, and the inline latest-report
  blocks (lines 750-790).
- Add: `wizardOpen` state; header `+ New Report` `<Button>` (plus icon from
  lucide); empty-state CTA button; render `<NewReportWizard>` with
  `onReportCreated` = prepend to the right list + `router.push(detailHref)`.
- History loading state: swap the text-only "Loading reports..." for 3 `Skeleton`
  rows (plan 012 component).
- Expected size after: ~300 lines.

### Step 3: History row polish (small, no redesign)

- Keep row layout; use `Badge` for the "Comparison" chip.
- Add `data-tour="new-report-button"` on the New Report button and
  `data-tour="report-history"` on the history card (anchors for plan 014).

## Test plan

Manual, at `/dashboard/reports` with a workspace that has ≥2 businesses (one with
0 synced reviews if possible):

1. Page shows only header + button + history. No tabs, no builder card.
2. Wizard happy path single: type → business → settings → summary → generate →
   lands on `/dashboard/reports/{id}`; report appears in history on Back.
3. Wizard happy path comparison with 2 and with 3 businesses; 4th click blocked.
4. Business with 0 reviews is disabled with hint in both modes.
5. One-business workspace: step 2 auto-skips; Back from step 3 returns to step 1.
6. 422 path (business with reviews synced but none in This Month): message shows
   inline, wizard stays open, switching period to All Time then Generate succeeds.
7. Escape/overlay close blocked while generating; allowed otherwise; state resets
   on reopen.
8. Arabic UI (`dir=rtl`): dialog renders correctly, step pills and footer flip.
9. `npm run typecheck` + `npm run lint` clean.

## Done criteria

- The select-business card and single/compare tabs no longer exist on the page.
- All report generation goes through the wizard; both API endpoints receive the
  same payloads as before (verify in network tab).
- History remains filtered by the global active business, as today.

## STOP conditions

- STOP if plan 012 is not merged (no Dialog component) — do not hand-roll a modal.
- STOP if you find other pages importing the deleted builder pieces from
  `ReportsPageClient` (grep first: `grep -rn "ReportsPageClient" src/`) — report
  instead of guessing.
- STOP before changing either generation API route — if a payload change seems
  needed, the plan is wrong; flag it.

## Follow-ups (explicitly not in this plan)

- History filters (All / Single / Comparison) and pagination once users
  accumulate many reports.
- Persisting last-used period/language as user preference.
- Streaming/progress UI for generation (backend work).
