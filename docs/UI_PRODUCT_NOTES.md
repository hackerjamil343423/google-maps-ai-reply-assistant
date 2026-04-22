# UI And Product Notes

## Current UI Assessment

- Current dashboard UI rating: 5.5/10.
- The product feels usable, but not fully intentional yet.
- Main issues:
  - weak visual hierarchy
  - too much empty space in overview and empty states
  - confusing page purpose and navigation structure
  - low-contrast styling in important areas
  - the sidebar feels heavier than the content

## Structural Problems Found

- `Overview` currently behaves like a reviews management page instead of a real overview.
- `API` in the sidebar actually routes to the Google connection page, which is misleading.
- `Team`, `Subscription`, and Google connection are separate pages, but they fit better under a single `Settings` experience.
- `Get More Reviews` is too long as a sidebar label.
- The empty state on the overview page feels unfinished because the content area is too tall for the amount of content shown.

## Requested Product Direction

- Make the platform easier to use.
- Move `Team`, `Subscription`, and the current `API`/Google connection area into `Settings`.
- Redesign `Settings` so it becomes the central workspace for:
  - AI reply settings
  - Google Business connection
  - team management
  - billing/subscription
- Keep the same color palette and visual style, but make the UI more modern, professional, clean, and easy to use.
- Rename `Get More Reviews` to a shorter and clearer label.
- Fix the large empty space shown on the overview page.

## Implementation Direction

- Sidebar should be simplified to:
  - Overview
  - Reviews
  - Analytics
  - Review Link
  - Settings
- Old routes for `Team`, `Subscription`, and the Google connection page should redirect into `Settings` sections for backward compatibility.
- `Settings` should use section-based navigation and summary cards so users can understand status quickly.
- `Overview` should show a proper onboarding/connection empty state instead of a large blank content well.
