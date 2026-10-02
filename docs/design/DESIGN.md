# Design System

> **Status: not yet defined.** This is the next step after project setup (ROADMAP M0).
> Until it is filled in, agents must **not** invent visual styles. Use unstyled shadcn/ui defaults and leave a `// TODO(design)` marker.

Visual reference: Bubble prototype (https://flashd-53080.bubbleapps.io/version-test/). It is the layout reference; the style below will supersede it once defined.

## To define

1. **Brand**: personality (3–5 adjectives), name and logo usage, voice and tone for UI copy.
2. **Tokens** (implemented as CSS variables in `src/app/globals.css` via Tailwind v4 `@theme`):
   - Colour: background, foreground, surface/card, muted, border, primary, secondary, accent, destructive, success, warning, plus **status chip colours** for every ad status (PRD §9.1). Light and dark modes.
   - Typography: font families, type scale, weights, line heights.
   - Spacing scale, radii, shadows/elevation, motion (durations, easings, reduced motion).
   - Breakpoints (minimum 360 px, see PRD §12).
3. **Core components**: button variants, inputs and forms, status chip, ad card (with hover preview), video tile, empty states, toasts, dialogs, nav (per role).
4. **Key screens**: landing, marketplace grid, ad detail, upload flow (progress and processing), project editor (player, timeline, burst list), admin review queue.
5. **Editor-specific**: timeline visuals, burst markers (normal, selected, dragging, unavailable), the "Ad" label during preview, the unified progress bar with highlighted burst segments.
6. **Accessibility**: contrast (WCAG 2.2 AA), focus ring style, touch target size.
