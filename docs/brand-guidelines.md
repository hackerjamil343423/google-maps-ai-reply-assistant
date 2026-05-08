# Wakkelni Stars — Brand Guidelines & AI Design Prompt

> Copy the **"AI Design Prompt"** section below and paste it into any AI image/design tool (Midjourney, DALL-E, Figma AI, v0, etc.) to generate on-brand designs.

---

## Brand Identity

**Name:** Five Star Reply
**Product:** AI-powered Google Business Profile review management SaaS
**Mood:** Premium, modern, trustworthy, clean, professional
**Aesthetic:** Minimal glassmorphism with soft purple gradients — think "Stripe meets Linear"

---

## Color Palette

| Role | Hex | Usage |
|---|---|---|
| Brand Primary | `#5F30EB` | Buttons, links, accents, primary actions |
| Brand Secondary | `#00E0FF` | Highlights, gradients, secondary accents |
| Background | `#F6F4FF` | Page backgrounds (light purple-tinted white) |
| Foreground / Text | `#040404` | Primary text (near black) |
| Secondary Text | `#6B6487` | Descriptions, subtitles (purple-gray) |
| Muted Text | `#4E4E5E` | Body text, less prominent labels |
| Border Light | `#E6E1FA` | Card borders, dividers (light purple) |
| Card Background | `#FFFFFF` | Cards, panels, modals |
| Success | `#22c55e` | Active states, positive indicators |
| Error | `#ef4444` | Alerts, error states |

### Opacity Variants (use frequently)

| Token | Value | Use |
|---|---|---|
| Primary 8% | `rgba(95,48,235,0.08)` | Subtle backgrounds, grid lines |
| Primary 12% | `rgba(95,48,235,0.12)` | Hover states, light fills |
| Primary 20% | `rgba(95,48,235,0.20)` | Borders, selected states |
| Primary 34% | `rgba(95,48,235,0.34)` | Active highlights |
| Secondary 22% | `rgba(0,224,255,0.22)` | Accent glows, landing orbs |

---

## Typography

**Font Family:** Geist (sans-serif) — clean geometric modern font
**Monospace:** Geist Mono — for numbers, code, data

| Style | Size | Weight | Tracking |
|---|---|---|---|
| Hero Title | 36–48px | Bold (700) | Tight |
| Section Title | 24px | Semibold (600) | Normal |
| Card Title | 18–20px | Semibold (600) | Normal |
| Body Text | 14–16px | Regular (400) | Normal |
| Label / Badge | 12px | Medium (500) | Wide (0.05em) |
| Uppercase Label | 12px | Medium (500) | Widest (0.1em) |

---

## Shapes & Radius

| Element | Radius |
|---|---|
| Buttons (primary) | Full pill (`9999px`) or `12px` |
| Cards | `12–16px` |
| Large panels / hero sections | `24px` |
| Sidebar container | `28px` |
| CTA banners | `32px` |
| Inputs | `6–8px` |
| Avatars / icons | Full circle |

---

## Shadows

All shadows use the brand purple (`#5F30EB`) as tint — never plain gray.

```
Cards:        0 14px 32px rgba(95,48,235, 0.08)
Cards hover:  0 18px 40px rgba(95,48,235, 0.13)
Sidebar:      0 4px 24px rgba(95,48,235, 0.08)
Active nav:   0 4px 16px rgba(95,48,235, 0.24)
Dropdowns:    0 8px 24px rgba(95,48,235, 0.12)
Chat widget:  0 14px 40px rgba(4,4,4, 0.12)
Glass panels: 0 12px 32px rgba(20,20,40, 0.08)
              + inset 0 1px 0 rgba(255,255,255, 0.85)
```

---

## Gradients

```
Hero / Landing:     radial gradient — cyan glow top-center fading out,
                    purple glow top-right fading out,
                    base #f6f7ff

Dashboard BG:       radial purple top-right → linear #F8F7FF to #F2EEFF

Card fill:          linear #ffffff → #f8f9ff (top to bottom)

CTA / Accent:       linear 135deg, #5F30EB → #00E0FF (purple to cyan)

Section divider:    horizontal purple gradient fading at both ends
```

---

## Component Patterns

**Buttons:**
- Primary: solid `#5F30EB` bg, white text, pill or rounded-xl
- Secondary: white bg, `#5F30EB` border + text, no fill
- Hover: subtle scale (1.02–1.05) + shadow increase

**Cards:**
- White background, `border: 1px solid rgba(95,48,235, 0.2)`
- Subtle top-to-bottom gradient fill (white → faint purple-white)
- Purple-tinted shadow
- Hover: lift up 2–3px + deeper shadow

**Inputs:**
- Border `#E6E1FA`, focus ring purple glow
- Placeholder text `#6A6A82`

**Icons:** Outlined style, 20–24px, color `#7A7A90` default, `#5F30EB` active

---

## Effects

- **Glassmorphism:** `backdrop-blur: 12–24px` + semi-transparent white background
- **Grid background:** 38px grid lines in `rgba(95,48,235, 0.08)`
- **Background orbs:** Large blurred circles (blur-3xl) in primary/secondary colors for hero sections
- **Transitions:** 200–300ms ease on all interactive elements

---

## What to AVOID

- Heavy text blocks — designs must be **visual-first**, not text-first
- Cluttered or busy layouts with too many competing elements
- Overly complex illustrations or ornamental decorations
- More than 2–3 colors in a single composition
- Dense information architecture — each section should have **one clear purpose**
- Generic stock-photo aesthetics
- Sharp corners (always use rounded corners)
- Gray-box brutalist UI — always use the purple-tinted palette
- Long paragraphs where an icon + label would suffice

**Design principle:** If it cannot be understood in 3 seconds, simplify it.

---