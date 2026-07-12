# Plan 012: Adopt square-ui component foundation + rebuild the dashboard sidebar

Mission 2 of the 2026-07-12 UX revamp. This plan creates the shared UI component
layer (Button, Dialog, DropdownMenu, Tooltip, Sheet, Skeleton, …) ported from the
square-ui template collection, themes it with the Wakkelni brand, and rebuilds the
dashboard sidebar on top of it. Plans 013 (reports wizard) and 014 (product tour)
build on the components created here — **this plan must land first**.

## Status

DONE — implemented and verified on 2026-07-12.

## Why this matters

- The app has **zero shared UI primitives**: every button, dropdown, and card is
  hand-rolled JSX with inline hex colors (`#5F30EB`, `#E6E1FA`, …) repeated in
  dozens of files. Any brand change requires a global find/replace.
- Hand-rolled dropdowns (`WorkspaceSelector`, `BusinessSelector` in
  `src/components/DashboardShell.tsx`) re-implement click-outside handling and have
  no keyboard navigation, focus trapping, or ARIA roles. Radix-based components fix
  accessibility for free.
- There is no Dialog component at all — plan 013's report wizard needs one.
- The square-ui project at `C:\Users\Lenovo\Desktop\telmeeh\square-ui` is a
  shadcn-style template collection on the **exact same stack** (Next 16, React 19,
  Tailwind v4, TypeScript 5), so its components port with no framework friction.

## Current state

- Main project `package.json` has no UI deps: no Radix, no clsx/tailwind-merge, no
  icon library (all icons are inline SVG).
- `src/components/ui/` contains only `onboarding.tsx` (a headless wizard used by
  `/onboarding` — keep it, plan 013 reuses its patterns).
- `src/app/globals.css` defines only 3 brand vars (`--brand-primary: #5F30EB`,
  `--brand-secondary: #00E0FF`, `--brand-text`) plus landing-page classes. No
  shadcn-style semantic tokens (`--primary`, `--border`, `--muted`, …).
- `src/components/DashboardShell.tsx` (581 lines) contains the whole shell:
  `NAV_ITEMS`, `SidebarSection`, `WorkspaceSelector` (hand-rolled dropdown),
  `SidebarContent`, `BusinessSelector` (hand-rolled dropdown), mobile overlay
  drawer, collapse state persisted in `localStorage`
  (`dashboard_sidebar_collapsed`).
- **RTL is load-bearing**: `LanguageProvider` sets `dir` on `<html>` before paint;
  DashboardShell uses logical utilities (`start-0`, `ps-*`, `ms-*`). Arabic UI is
  a real product surface (KSA market).

### Source components in square-ui (verified on disk)

| Component | Best source template | Notes |
|---|---|---|
| `button.tsx` | `templates/tasks/components/ui/button.tsx` | CVA variants: default/destructive/outline/secondary/ghost/link; sizes incl. icon |
| `dialog.tsx` | `templates/tasks/components/ui/dialog.tsx` | Radix dialog, animated overlay/content, `showCloseButton` prop |
| `dropdown-menu.tsx` | `templates/tasks/` or `templates/dashboard-2/` | Radix |
| `tooltip.tsx` | any (20/20 templates have it) | Radix |
| `sheet.tsx` | any (20/20) | Used for mobile sidebar |
| `sidebar.tsx` | `templates/dashboard-2/components/ui/sidebar.tsx` (726 lines) | Full shadcn sidebar: `SidebarProvider`, cookie persistence, `collapsible="icon"`, mobile Sheet, tooltip-on-collapsed |
| `skeleton.tsx`, `separator.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `badge.tsx`, `avatar.tsx`, `checkbox.tsx`, `progress.tsx` | `templates/dashboard-2/`, `templates/habit-tracker/`, `templates/projects-timeline/` | Port as needed |
| `cn()` util | any template's `lib/utils.ts` | `clsx` + `tailwind-merge` |

Dependencies these components need (from `templates/tasks/package.json`):
`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`,
`@radix-ui/react-tooltip`, `@radix-ui/react-slot`, `@radix-ui/react-separator`,
`@radix-ui/react-avatar`, `@radix-ui/react-select`, `@radix-ui/react-label`,
`class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, and dev-dep
`tw-animate-css` (the `animate-in/out` utilities the dialog/sheet classes use —
Tailwind v4 replacement for `tailwindcss-animate`).

## Commands you will need

```bash
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tooltip @radix-ui/react-slot @radix-ui/react-separator @radix-ui/react-avatar @radix-ui/react-select @radix-ui/react-label class-variance-authority clsx tailwind-merge lucide-react
npm install -D tw-animate-css
npm run typecheck && npm run lint && npm run dev
```

## Scope

**In scope**
1. Dependency install + `src/lib/utils.ts` (`cn`).
2. Brand-mapped semantic theme tokens in `globals.css`.
3. Port core components into `src/components/ui/`: button, dialog, dropdown-menu,
   tooltip, sheet, skeleton, separator, input, label, select, badge, avatar.
4. Rebuild `DashboardShell` sidebar on the ported components (keep the same visual
   identity — this is a refactor of mechanics, not a redesign).
5. Replace the two hand-rolled dropdowns (workspace + business selector) with
   `DropdownMenu`.

**Out of scope (do NOT do here)**
- Rewriting every page's buttons/cards to the new components. That is incremental
  follow-up work; only the sidebar and anything you touch anyway migrate now.
- The reports page (plan 013) and product tour (plan 014).
- Dark mode. Tokens should be structured so dark mode is *possible* later, but do
  not ship a dark theme.
- Do not copy square-ui templates wholesale (mock-data, zustand stores, charts).

## Git workflow

Branch `feat/ui-foundation` off `dev`. One commit per step below. PR into `dev`.

## Steps

### Step 1: Install deps and create `cn()`

- Run the npm install commands above.
- Create `src/lib/utils.ts`:
  ```ts
  import { clsx, type ClassValue } from "clsx";
  import { twMerge } from "tailwind-merge";

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  ```
- Verify `tsconfig.json` has the `@/*` path alias (it does — same convention as
  square-ui, so ported imports `@/lib/utils` work unchanged).

### Step 2: Theme tokens in `globals.css`

Add shadcn-compatible semantic tokens mapped to the **existing** brand palette so
ported components render on-brand without editing their class strings. Insert
after the current `:root` block:

```css
@import "tw-animate-css";

:root {
  /* existing vars stay */
  --card: #ffffff;
  --card-foreground: #040404;
  --popover: #ffffff;
  --popover-foreground: #040404;
  --primary: #5F30EB;
  --primary-foreground: #ffffff;
  --secondary: #F0EBFF;
  --secondary-foreground: #5F30EB;
  --muted: #F8F7FF;
  --muted-foreground: #6B6487;
  --accent: #F0EBFF;
  --accent-foreground: #5F30EB;
  --destructive: #dc2626;
  --border: #E6E1FA;
  --input: #E6E1FA;
  --ring: rgba(95, 48, 235, 0.35);
  --radius: 1rem; /* matches the rounded-2xl brand look */
}

@theme inline {
  /* existing mappings stay */
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 8px);
  --radius-md: calc(var(--radius) - 4px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

If the ported sidebar needs `--sidebar-*` tokens (dashboard-2's sidebar.tsx uses
them), add them mapped to the same palette (`--sidebar: #ffffff`,
`--sidebar-border: #E6E1FA`, `--sidebar-accent: #F0EBFF`, etc.).

### Step 3: Port the components

Copy from the source templates listed above into `src/components/ui/`, then adapt:

1. **Imports**: `@/lib/utils` already resolves; icons come from `lucide-react`.
2. **RTL pass (required on every file)**: square-ui uses physical classes. Replace:
   - `left-*` / `right-*` → `start-*` / `end-*` (e.g. dialog close button
     `absolute top-4 right-4` → `absolute top-4 end-4`)
   - `ml-/mr-` → `ms-/me-`, `pl-/pr-` → `ps-/pe-`, `text-left` → `text-start`
   - Radix `side`/`align` props are fine (they're viewport-relative), but Sheet's
     default `side="left"` must be passed dir-aware by callers.
3. **Radius**: components use `rounded-md`/`rounded-lg`; with `--radius: 1rem`
   these resolve to the brand's soft-rounded look. Spot-check the Button — if it
   still reads sharp next to existing `rounded-2xl` buttons, override the base
   class in `buttonVariants` to `rounded-xl`.
4. Keep each file's shadcn structure intact otherwise (data-slot attrs, variants) —
   this keeps future component ports copy-pasteable.

### Step 4: Rebuild the sidebar

Two viable approaches — **take approach A** unless you hit a blocker:

**A (recommended): keep DashboardShell's structure, swap its internals.**
The current sidebar's *visual design* (floating rounded card, brand shadows,
collapse-to-icons) is good and custom; the shadcn `sidebar.tsx` would fight it.
So do NOT port the 726-line sidebar.tsx. Instead:
- `WorkspaceSelector` → rebuild on `DropdownMenu` (trigger keeps current styling
  via `className`; items get keyboard nav/ARIA for free). Delete its manual
  click-outside `useEffect`.
- `BusinessSelector` → same treatment.
- Collapsed-state nav tooltips (the hand-rolled `group-hover` span in
  `SidebarSection`) → `Tooltip` with `side="right"` flipped to `side="left"` when
  `dir === "rtl"` (read from `useLanguage()`).
- Mobile overlay (`mobileOpen` block, lines 529-546) → `Sheet` with dir-aware
  `side` (`"left"` LTR / `"right"` RTL). Delete the manual backdrop div.
- Logout / toggle buttons → `Button` with `variant="outline"` / `variant="ghost"`
  + `size="icon"`, preserving current classes where the variant doesn't match.
- Keep: `NAV_ITEMS` export (other files may import it), `localStorage` collapse
  persistence, `/api/me` + `/api/workspaces` fetching, `handleSwitchWorkspace`,
  active-item styling, the brand logo header.

**B (only if the user later asks for a full visual redesign):** port
`templates/dashboard-2/components/ui/sidebar.tsx` + its `SidebarProvider` and
rebuild the shell on `Sidebar collapsible="icon"`. Requires the `--sidebar-*`
tokens, a `use-mobile` hook, and a full RTL audit of the 726-line file. Not this
plan's default.

### Step 5: Add `data-tour` anchors (cheap prep for plan 014)

While editing DashboardShell, add stable attributes plan 014 will target:
`data-tour="sidebar-nav"` on the nav, `data-tour="workspace-selector"`,
`data-tour="business-selector"`. Zero runtime cost.

## Test plan

- `npm run typecheck` and `npm run lint` pass.
- `npm run dev`, then manually:
  - Sidebar renders identically to before (compare against `dev` branch
    screenshots) in expanded + collapsed + mobile states.
  - Workspace switcher and business selector open with mouse AND keyboard
    (Enter/Arrow keys), close on Escape and outside click.
  - Switch language to Arabic: sidebar sits on the right, Sheet opens from the
    right, tooltips flip, dropdowns align correctly.
  - Collapse state survives reload (localStorage).
- Grep check: `grep -rn "addEventListener(\"mousedown\"" src/components/DashboardShell.tsx`
  returns nothing (hand-rolled outside-click code removed).

## Done criteria

- `src/components/ui/` contains the ported set; all use `cn()` and semantic tokens.
- `globals.css` has the semantic token block; no component hardcodes new hex values.
- DashboardShell dropdowns/tooltips/mobile-drawer run on Radix; behavior parity
  confirmed in EN and AR.
- No existing page is visually broken (spot-check every `/dashboard/*` route).

## STOP conditions

- STOP if `npm install` pulls a Radix version requiring React ≥19.3 or otherwise
  conflicts with `react@19.2.3` — report versions instead of forcing.
- STOP if Tailwind v4 `@theme inline` token mapping doesn't get picked up by
  ported component classes (e.g. `bg-primary` unstyled) — diagnose before
  hand-patching hex values into components.
- STOP before changing any auth/session/fetch logic in DashboardShell — this plan
  touches presentation only.

## Maintenance notes

- Future components: copy from square-ui templates, run the same RTL pass
  (step 3.2). Keep `src/components/ui/` as the single home.
- When a page is next touched for any reason, migrate its ad-hoc buttons to
  `<Button>` opportunistically.
