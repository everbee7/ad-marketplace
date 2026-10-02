# Design System

> **Status: v0.1, derived from the client's Bubble prototype** (scraped 2026-10-02).
> Sources: the landing page (`/version-test/`) and the business portal (`/version-test/business-portal`) at https://flashd-53080.bubbleapps.io.
> Screenshots are in [reference/](reference/). Values below are the computed styles of those pages, normalised into tokens.
> Anything marked **(provisional)** is not in the prototype. It was extrapolated from the same palette and needs client sign-off ([§10](#10-open-questions-for-the-client)).
> Agents: use these tokens and patterns. Don't add new colours, fonts or radii. If a screen needs something not covered here, use the closest pattern and leave a `// TODO(design)` marker.

| Reference | File |
| --- | --- |
| Landing, 1440 px | [reference/landing-desktop.png](reference/landing-desktop.png) |
| Landing, 390 px | [reference/landing-mobile.png](reference/landing-mobile.png) |
| Business portal, 1440 px | [reference/business-portal-desktop.png](reference/business-portal-desktop.png) |
| Business portal at a 390 px viewport (the prototype is fixed at 1200 px, not responsive) | [reference/business-portal-1200.png](reference/business-portal-1200.png) |

## 1. Brand

- **Personality:** bold, minimal, electric, premium, fast.
- **Look:** pure black canvas, white type, thin hairline borders, **all-caps labels with wide letter-spacing**. One accent colour (electric blue), used only for primary actions in the app and its glow.
- **Name:** `FLASHD`, always uppercase in the wordmark, tracked wide (letter-spacing ≈ 0.2–0.3 em). In running text, "Flashd".
- **Logo:** a white lightning bolt inside a white circle outline. Used large on the landing hero (≈ 140 px) and as a small bolt glyph (≈ 12–16 px) in the app header. A small "FLASHD" logotype image sits left of the wordmark in the landing nav. Ask the client for the SVG source files ([§10](#10-open-questions-for-the-client)).
- **Tagline:** "AD TIME. BACK." Supporting line: "Advertising measured in attention, not impressions."
- **Voice:** short, declarative, confident. Headlines and labels are uppercase and terse ("ENTER THE PORTAL", "+ ADD AD", "VIEW PROFILE"). Descriptions and names are sentence or title case ("Uploads Flashd Ad", "Creator Name").
- **Vocabulary from the prototype:** "Portal", "Ad Library", "Attention Units™ (AU)" with "1 AU = 1 delivered attention", "Purchased / Delivered / Remaining", "Balance", "Suggested creators". See [§10](#10-open-questions-for-the-client): AU and balance are not in the PRD yet.

## 2. Colour tokens

Dark mode only for the MVP (the prototype has no light theme). Implement as CSS variables in `src/app/globals.css` through Tailwind v4 `@theme`, mapped onto the shadcn/ui variable names.

| Token | Value | Source / use |
| --- | --- | --- |
| `--background` | `#000000` | Page canvas (both pages) |
| `--foreground` | `#FFFFFF` | Headings, primary text, icons |
| `--foreground-secondary` | `rgb(255 255 255 / 0.8)` | Body copy, subtitles, step descriptions (landing) |
| `--muted-foreground` | `rgb(255 255 255 / 0.6)` | Stat labels, "BALANCE" |
| `--subtle-foreground` | `rgb(255 255 255 / 0.5)` | Section eyebrows, categories, placeholders. **Minimum** for text (5.3:1 on black) |
| `--link-muted` | `#A6A6A6` | Footer links |
| `--surface` / `--card` | `#0F0F0F` | Cards (creator card, ad card) |
| `--input` | `#141414` | Text inputs, search |
| `--surface-raised` | `#262626` | Popovers, menus, the raised control surface |
| `--border` | `rgb(255 255 255 / 0.15)` | Card and input hairlines (app) |
| `--border-strong` | `rgb(255 255 255 / 0.2)` | Landing nav tiles, outline buttons on cards use `0.3` |
| `--divider` | `#333333` | Footer top rule, separators |
| `--primary` | `#4B9CD3` | Electric blue: primary button border, focus, active states |
| `--primary-glow` | `rgb(75 156 211 / 0.45)` | Primary button glow (`0 0 8px`) |
| `--primary-ambient` | `rgb(75 156 211 / 0.15)` | Large ambient panel glow (`0 0 70px`) |
| `--ring` | `#4B9CD3` | Focus ring |
| `--destructive` | `#E5484D` **(provisional)** | Errors, delete, rejected/removed |
| `--success` | `#3DD68C` **(provisional)** | Live, upload complete |
| `--warning` | `#F5B544` **(provisional)** | In review, unlisted |

Rules:
- The canvas is always pure black. Elevation comes from a slightly lighter surface plus a hairline border, never from a grey page.
- Blue is the **only** accent. Use it for the one primary action per area, focus and selection. Don't fill large areas with it: buttons are outlined with a glow, not solid.
- White-alpha text levels (100 / 80 / 60 / 50 %) are the text hierarchy. Don't go below 50 % for text.

### 2.1 Status chips (PRD §9.1) **(provisional)**

Chip: uppercase 11 px, weight 500, letter-spacing 0.1 em, height 22 px, padding `0 8px`, radius 999 px, 1 px border in the status colour at 40 % alpha, fill at 12 % alpha, text in the status colour. Always include the text label: colour is never the only signal.

| Status | Label | Colour |
| --- | --- | --- |
| `uploading` | Uploading… | `--foreground` at 60 %, with a progress indicator |
| `failed` | Failed | `--destructive` |
| `pending_review` | In review | `--warning` |
| `live` | Live | `--success` |
| `unlisted` | Unlisted | `--muted-foreground` |
| `rejected` | Rejected | `--destructive` |
| `removed` | Removed | `--destructive` text and border on a neutral `--surface-raised` fill (terminal state) |

Creator video (`uploading`, `ready`, `failed`) and project (`draft`, `saved`) states reuse the same chip: `ready`/`saved` = success, `draft` = muted.

## 3. Typography

The prototype uses two families.

| Token | Stack | Use |
| --- | --- | --- |
| `--font-display` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | Wordmark, hero headline, page titles, section titles, app UI (the business portal is set entirely in it) |
| `--font-sans` | `Archivo` (weights 300, 400, 500, 700) | Landing nav, CTAs, body copy, footer |

Load Archivo with `next/font/google` (self-hosted at build time, so no third-party runtime request; compatible with ADR-0005). Helvetica is a system stack.

**Type scale** (px; letter-spacing in em; `UC` = uppercase):

| Role | Family | Size / line-height | Weight | Tracking | Case | Seen as |
| --- | --- | --- | --- | --- | --- | --- |
| Hero | display | 52 / 1.02 (mobile 40) | 700 | −0.02 | UC | "AD TIME. BACK." |
| Wordmark large | display | 30 / 1 | 700 | 0.2 | UC | "FLASHD" under the logo |
| Section title (marketing) | sans | 28 / 1.15 | 700 | 0.07 | UC | "ATTENTION UNITS™" |
| Page title (app) | display | 22 / 1 | 700 | 0.36 | UC | "BUSINESS PORTAL" |
| Wordmark nav | display | 20 / 1 | 700 | 0.15 | UC | "FLASHD" in the nav |
| Panel title | display | 18 / 1 | 700 | 0.17 | UC | "AD LIBRARY", "CREATORS" |
| Lead | display | 17 / 1.5 | 300 | 0.18 | sentence | Hero subline, 80 % white |
| Stat value | display | 17 / 1 | 700 | 0 | — | "0", "$0.00" |
| CTA large | sans | 16 / 1.5 | 500 | 0.19 | UC | "ENTER THE PORTAL" (hero) |
| Tile label | display | 14 / 1.2 | 700 | 0.14 | UC | "BUSINESS", "CREATOR" tiles |
| Body | sans | 14 / 1.6 | 400 | 0 | sentence | Paragraphs, 80 % white |
| Button | display | 13 / 1 | 700 | 0.15 | UC | "+ ADD AD", "MANAGE" |
| Nav link | sans | 13 / 1 | 300 | 0.15 | UC | "HOW IT WORKS" |
| Card name | display | 13 / 1 | 700 | 0 | title | "Creator Name" |
| Step title | sans | 13 / 1 | 700 | 0.15 | UC | "BUSINESS", "FLASHD PORTAL" |
| Caption | sans | 13 / 1.3 | 400 | 0 | title | "Uploads Flashd Ad", 80 % white |
| Eyebrow | display | 11–12 / 1 | 400–700 | 0.2–0.25 | UC | "SUGGESTED CREATORS", "HOW IT WORKS", 50 % white |
| Small button / meta | display | 11 / 1 | 500 | 0.09 | UC | "VIEW PROFILE", "PURCHASED" |
| Footer | sans | 11 / 1.4 | 500 | 0.14 | UC | Copyright and links |
| Micro label | display | 10 / 1 | 700 | 0.2 | UC | "ATTENTION UNITS" stat group label |

Rules:
- **Uppercase + tracking** is the signature. Anything that is a label, button, title, nav item or eyebrow is uppercase with 0.09–0.36 em tracking. User content (names, ad titles, descriptions) keeps its own case.
- Bold (700) for titles and buttons, 300 for the lead line and nav links. Don't use 600.
- Body text never smaller than 13 px. 10–11 px is allowed only for uppercase labels.

## 4. Spacing, layout, radii, elevation, motion

**Spacing:** 4 px base. Steps used: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96.

**Layout:**
- Landing: full-bleed black, centred single column, content max ≈ 900 px. Nav padding `~50px` horizontal at desktop. Large vertical gaps between sections (≈ 160 px).
- App (portal): centred container **max 1200 px**, 40 px side padding at desktop. Header row ≈ 100 px: bolt logo left, page title centred, account/balance right. Content in **two equal columns** (24 px gap) on desktop, e.g. "Ad Library" | "Creators".
- Card grids: 3 columns of creator cards (12 px gap) inside a half-width column. 2 columns of ad cards.
- Footer: 64 px tall, 1 px `--divider` top rule, copyright left, links right (gap 32 px).

**Radii:**

| Token | Value | Use |
| --- | --- | --- |
| `--radius-none` | 0 | Marketing CTAs (sharp rectangle with white border) |
| `--radius-xs` | 4 px | Small internal elements |
| `--radius-sm` | 6 px | Small buttons inside cards, date/text input (landing) |
| `--radius-md` | 8 px | App buttons, inputs |
| `--radius-lg` | 10 px | Landing nav tiles |
| `--radius-xl` | 12 px | Cards and panels |
| `--radius-full` | 999 px | Avatars, circular icon badges, chips |

**Elevation** (no drop shadows on black; use glow and borders):

| Token | Value | Use |
| --- | --- | --- |
| `--shadow-card` | `0 0 8px rgb(0 0 0 / 0.5)` | Ad cards |
| `--glow-soft` | `0 0 24px rgb(255 255 255 / 0.08)` | Circular step icons (landing) |
| `--glow-primary` | `0 0 8px var(--primary-glow)` | Primary buttons |
| `--glow-ambient` | `0 0 70px var(--primary-ambient)` | The main app panel |

**Background texture (app):** the portal shows faint, thin curved lines over the black canvas and a soft blue ambient glow behind the main panel. Keep it subtle (lines ≤ 6 % white). It is decorative: `aria-hidden`, `pointer-events: none`.

**Motion** **(provisional; the prototype has no visible transitions):** 150 ms `ease-out` for hover/focus (border colour, glow intensity), 200 ms for dialogs and toasts. Hover on outlined buttons: border goes to full opacity and glow strengthens. Respect `prefers-reduced-motion`: no auto-playing card previews, no transitions beyond opacity.

**Breakpoints:** Tailwind defaults (`sm 640`, `md 768`, `lg 1024`, `xl 1280`), minimum supported width 360 px (PRD §12). Below `lg`, the two app columns stack (Ad Library first). The landing tiles wrap to one per row on mobile, as in the prototype.

## 5. Icons

Thin outline icons, 1.5 px stroke, white, as seen in the prototype (building = Business, video camera = Creator, lightning = Attention Units / Portal, two-people = Team). Use **lucide-react** (`Building2`, `Video`, `Zap`, `Users`), already part of the shadcn/ui setup. Sizes: 16 px in tiles and buttons, 24–28 px inside the 96 px circular step badge. Arrows between steps use a plain "→" at 24 px.

## 6. Components

All components start from shadcn/ui and are restyled with the tokens above.

**Buttons**

| Variant | Look | Use |
| --- | --- | --- |
| `primary` | Transparent fill, 1 px `--primary` border, `--glow-primary`, white uppercase 13 px / 700 / 0.15 em, radius 8, height 48 (default) or 32 (sm), padding `0 20px` | Main action in an app area ("+ ADD AD", "MANAGE") |
| `outline` | Transparent, 1 px border white 30 %, white uppercase 11 px / 500, radius 6, height 28–36 | Secondary actions in cards ("VIEW PROFILE") |
| `marketing` | Transparent, 1 px solid white, **radius 0**, uppercase Archivo 500, tracking 0.19 em; large = 16 px, height 50, padding `12px 24px`; nav = 12 px, height 34 | Landing CTAs ("ENTER THE PORTAL") |
| `ghost` | Text only, uppercase, 300 weight, tracking 0.15 em | Nav links |
| `destructive` **(provisional)** | Like `outline` with `--destructive` border and text | Delete, reject |

States: hover raises border to 100 % and doubles the glow. Focus: 2 px `--ring` outline, 2 px offset. Disabled: 40 % opacity, no glow. Loading: spinner replaces the leading icon, label stays.

**Nav tile** (landing): 160 px min width, 79 px tall, black fill, 1 px white 20 % border, radius 10, padding `16px 20px`, icon (16 px) above uppercase 14 px / 700 label, centred.

**Inputs:** height 40, fill `--input`, 1 px `--border`, radius 8, padding `10px 14px`, 13 px text, tracking 0.08 em. Placeholder uppercase in 50 % white ("SEARCH CREATORS"). Focus: border `--primary` + `--glow-primary`. Error: border `--destructive` and a 12 px message below. Labels: eyebrow style above the field.

**Panel:** a titled section. Panel title (18 px UC) at top, content below. The primary app panel sits on the canvas with `--glow-ambient`.

**Stat group:** micro label ("ATTENTION UNITS") above a row of `value + label` pairs: value 17 px / 700 white, label 11 px UC 60 % white, baseline-aligned, 20 px between pairs. The balance in the header uses the same pattern ("$0.00 BALANCE") with a `primary` sm button below.

**Creator card:** 175 × 158 px, fill `--surface`, 1 px `--border`, radius 12, padding 12, centred: 56 px circular avatar (1 px border white 15 %), name 13 px / 700, category 11 px 50 % white, full-width `outline` button "VIEW PROFILE".

**Ad card (with hover preview):** 2-column grid, ≈ 274 × 130 px, fill `--surface`, 1 px `--border`, radius 12, `--shadow-card`. The thumbnail fills the card. A bottom scrim (`linear-gradient(to bottom, transparent, rgb(0 0 0 / 0.75))`, lower ≈ 70 % of the card) carries the title (13 px / 700) and the status chip. Hover/focus: border `--primary`, the burst clip plays muted in place (not when reduced motion is on). Duration badge top-right (e.g. "1.5 s", chip style, neutral).

**Video tile** (creator videos, projects) **(provisional)**: same shell as the ad card at 16:9, with duration and status chip.

**Step item** (landing "How it works"): 96 px circle, 1 px white 20 % border, `--glow-soft`, icon centred; below it a step title (13 px UC / 700) and a caption (13 px, 80 %). Steps are joined by "→".

**Header (app):** bolt logo left (links home), page title centred (22 px UC, tracking 0.36 em), right side role-specific (business: balance + MANAGE; creator/admin: their equivalent and the account menu). **Header (marketing):** logotype + wordmark left, "HOW IT WORKS" ghost link and nav-size `marketing` button right.

**Empty state:** eyebrow-styled message in 50 % white, centred in the panel, with the panel's primary action below (e.g. "NO ADS YET" + "+ ADD AD").

**Toasts, dialogs, menus** **(provisional)**: `--surface-raised` fill, 1 px `--border`, radius 12, title in panel-title style, actions right-aligned (primary last). Overlay `rgb(0 0 0 / 0.7)`.

## 7. Key screens

| Screen | Status | Direction |
| --- | --- | --- |
| Landing | **From prototype** | Header · hero (logo, wordmark, 4 nav tiles, "AD TIME. BACK.", lead, CTA) · "How it works" 3 steps · Attention Units block · footer |
| Business portal (dashboard) | **From prototype** | Header with balance · two columns: Ad Library (+ ADD AD, ad grid, AU stats) and Creators (search, suggested creator cards) |
| Marketplace grid | Provisional | App header + search input + filter chips; ad cards in a responsive grid (2 → 3 → 4 columns) |
| Ad detail | Provisional | Large player on the left, metadata panel on the right, primary "USE THIS AD" |
| Upload flow | Provisional | Dialog: drop zone (dashed 1 px white 20 % border, radius 12), progress bar in `--primary`, then status chip |
| Project editor | Provisional | See §8 |
| Admin review queue | Provisional | Table on `--surface`, uppercase column headers in eyebrow style, row actions as `outline`/`destructive` sm buttons |
| Creator portal | Provisional | Mirror the business portal: header "CREATOR PORTAL", two columns (My Videos / Marketplace picks) |

## 8. Editor-specific **(provisional)**

- **Player:** 16:9, black, radius 12, 1 px `--border`. During a burst, an "AD" label sits top-left: chip style, white text on `rgb(0 0 0 / 0.6)`, uppercase 11 px / 700.
- **Unified progress bar:** 4 px track in white 20 %, played part white; burst segments are filled `--primary`.
- **Timeline:** `--surface` strip, 64 px tall, radius 8; frame thumbnails at 60 % opacity.
- **Burst markers:** normal = `--primary` block with 1 px white 30 % border. Selected = full white border + `--glow-primary`. Dragging = 80 % opacity, cursor `grabbing`, time tooltip above. Unavailable (ad no longer live) = `--destructive` hatched fill with a tooltip explaining why.
- **Burst list:** rows on `--surface`, ad thumbnail + title + timestamp (tabular figures) + remove (`ghost` icon button).

## 9. Accessibility

- WCAG 2.2 AA. All text tokens pass on black (white 50 % = 5.3:1, `#A6A6A6` = 8.6:1, `#4B9CD3` = 7.0:1). Don't place 50 % text on `--surface-raised`.
- Focus: always visible, 2 px `--ring` outline with 2 px offset. Never remove outlines.
- Touch targets ≥ 44 × 44 px on touch layouts. The 28 px "VIEW PROFILE" and 32 px "MANAGE" buttons from the prototype must grow to 44 px below `lg`.
- Uppercase is applied with CSS (`text-transform`), never typed in caps, so screen readers read words normally.
- Decorative glow, texture and the large logo are `aria-hidden`. Icon-only buttons have `aria-label`.
- Reduced motion: no autoplay previews, no glow pulses.

## 10. Open questions for the client

1. **Light mode:** the prototype is dark only. We assume dark-only for the MVP.
2. **Status, error and success colours:** not in the prototype. The provisional values in §2 need approval.
3. **Logo files:** we need the SVG of the bolt-in-circle mark and the small "FLASHD" logotype.
4. **Fonts:** confirm the Helvetica (display/app) + Archivo (marketing) pairing, or use Archivo everywhere.
5. **Attention Units and Balance:** the prototype shows AU (purchased / delivered / remaining) and a money balance with "MANAGE". Neither is in the PRD (payments are out of MVP scope). Until the PRD changes, these UI blocks are **not built**; the portal header shows the account menu instead. Needs a PRD decision.
6. **"Meet our team"** tile on the landing has no matching page in the PRD.
7. The prototype's business portal is fixed at 1200 px. We make it responsive (§4) rather than copy that.
