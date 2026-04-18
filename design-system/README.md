# Homeo-Magic Design System

A design system for **Homeo-Magic** — a homeopathic remedy-finding tool that performs *repertorization*: patients present with multiple symptoms (rubrics), and the tool finds remedies that address all of them, ranked by grade scores (1–3).

The system is built on a **Geigy-era Swiss pharmaceutical** visual language: flat graphics, near-black ink, a quiet sage green, a signal teal, and generous white space. Typography is set in **Carlito** (metric-compatible with Calibri, used by the existing codebase) with **Source Serif 4** reserved for Kent's Materia Medica lecture text — a deliberate nod to the 1897 book origin.

---

## Index

| Path | What's in it |
|---|---|
| `colors_and_type.css` | Core CSS custom properties: palette, type scale, radii, shadows, motion, and semantic classes (`.hm-h1`, `.hm-body`, `.hm-eyebrow`, `.hm-serif`, …). Import this in every surface. |
| `assets/` | `mark.svg`, `logo-lockup.svg`, `logo-lockup-inverse.svg`, `potency-dot.svg`, `geigy-inspiration.jpg` (brand reference poster). |
| `preview/` | Design-system cards (swatches, type specimens, components) rendered as individual HTML files. Powers the Design System tab. |
| `ui_kits/web/` | High-fidelity React recreation of the Homeo-Magic web product (search → rubrics → results matrix → remedy detail). |
| `SKILL.md` | Cross-compatible skill file — can be used as an Agent Skill in Claude Code. |

---

## Product context

**One product, one surface.** Homeo-Magic is a Next.js single-page web UI (static export, deployed to GitHub Pages). The entire application lives at a single route; navigation is into a remedy-detail reader page at `/remedy/[slug]`.

**Core user flow:**
1. Type a rubric into the search field (e.g. `headache, morning`)
2. Select from autocomplete → the rubric appears as a row in the analysis matrix
3. Add more rubrics; the matrix updates live, ranking remedies by summed grade score
4. Click any remedy column → a detail panel + Kent's lecture panel appear below
5. Click any rubric → cross-references and grade breakdown show in the detail panel

The **matrix is the product**. It is a pivot between rubrics (rows) and remedies (columns); grade cells (1/2/3) show the weight of each rubric-remedy intersection. This is the single visual element that matters most — everything else supports it.

**Sources referenced:**
- Repo: `github.com/spokoco/homeo-magic` (private). Key files: `web/app/page.tsx`, `web/app/globals.css`, `web/app/MateriaPanel.tsx`, `web/app/LecturePanel.tsx`, `web/public/settings.html`.
- Visual direction: attached Pinterest poster — a Geigy-era Swiss pharmaceutical poster using near-black, sage, teal, and white.
- Brand colors (user-specified): `#151817`, `#A2B69E`, `#29A99E`, `#FFFFFF`.

> **Note:** The existing codebase ships a navy-and-amber palette (`--navy-dark: #042B58`, `--amber: #EF9B0C`). This design system **supersedes** that with the Geigy palette the user specified — treat the codebase as a structural reference (components, layouts, interactions), not a color reference.

---

## Content fundamentals

**Voice: precise, clinical, quiet.** Homeo-Magic is a reference tool for practitioners, not a consumer wellness brand. Copy is matter-of-fact and short. No exclamation marks, no emoji, no wellness-industry softness ("journey", "wellbeing", "holistic").

**Casing:** Sentence case throughout (`Add rubrics`, not `Add Rubrics`). Reserve Title Case for proper nouns (`Kent's Materia Medica`, `Homeo-Magic`). ALL CAPS only for eyebrows/tags (`RUBRIC`, `REMEDY`, `GRADE 3`) with wide letter-spacing.

**Pronouns:** Neither "I" nor "you" — the tool speaks about its objects (`3 remedies found`, `Clear all rubrics?`), not to the user.

**Terminology is fixed — match the domain.** Never paraphrase these terms:
- **Rubric** — a symptom entry in the repertory (e.g. *head, pain, morning*)
- **Remedy** — the homeopathic substance (e.g. *Nux vomica*, `Nux-v`)
- **Grade** — the 1/2/3 weight assigned to a remedy for a rubric
- **Repertorization** — the act of intersecting rubrics to find matching remedies
- **Materia Medica** — the body of remedy descriptions (Kent's, specifically)
- **Polychrest** — a frequently-indicated major remedy

**Examples (lifted from the codebase):**
- `Type to search (e.g., headache, anxiety, burning)...` — placeholder: concrete, domain-appropriate examples
- `74,000+ rubrics, 2,400+ remedies` — numbers earn their place; they calibrate scope
- `Search and select rubrics to find matching remedies` — empty state: instructive, no fluff
- `No remedies found for these rubrics` — null state: states the fact, offers no advice
- `Clear all rubrics?` / `This will remove all 3 selected rubrics and reset the analysis.` — confirmations are literal

**Numbers:** Always show them. `8 pts`, `3 remedies found`, `Showing 40 of 287 remedies`. The product is quantitative; hiding the math would betray it.

**Emoji: no.** The codebase ships one 🔮 (empty-state) — replace it with the mark SVG or the potency dot. No decorative emoji, no emoji in labels.

**Vibe:** A drug monograph or a Braun manual. The user is looking at data, not being marketed to.

---

## Visual foundations

### Colors

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#151817` | Body type, primary surface for dark frames, header blocks |
| `--sage` / `--sage-soft` | `#A2B69E` / `#e5ebe2` | Supportive surfaces (herbal, calm), row hover on light, empty-state panels |
| `--teal` / `--teal-deep` | `#29A99E` / `#1f857c` | **The signal color.** Active state, links, focus ring, primary buttons, selected-passage highlight |
| `--paper` | `#FFFFFF` | Default surface |
| `--grade-1/2/3-*` | warm terracotta ramp | Grade cells in the matrix — the one place warm color appears |

Everything else is an ink-based neutral ramp (`--ink-70`, `--ink-50`, `--ink-30`, `--ink-15`, `--ink-08`, `--ink-04`). **Do not introduce new hues.** The warm grade ramp is intentional — it makes the matrix cells instantly readable against the cool neutral system.

### Type

**Carlito** everywhere for UI. Bold is used sparingly — for headings, column labels, scores, and button labels. No light weight. Italic appears only in `.hm-quote` (serif).

**Source Serif 4** for Kent's Materia Medica lecture text inside the remedy reader — `font-family: var(--font-serif)`, `text-align: justify`, `hyphens: auto`. The serif is a **semantic** choice (this is 1897 book content, not UI) and should never leak into UI chrome.

**Scale is tight:** 12/13/15/16/18/22/28/36/48/64. Body is 15px. The matrix table uses 13–16px for density.

### Backgrounds

- Default page is **paper white**. Full-bleed ink frames for headers/banners only.
- No gradients (the original codebase used a navy→navy-dark gradient in the header — we flatten this to solid `--ink`).
- No photography, no illustration. The poster reference is an *inspiration*, not a motif to reuse on-screen.
- `--bg-sunken` (`#f5f6f4`) under table headers and sticky rows. `--bg-herb` (`#e5ebe2`) for the empty-state / informational surfaces.

### Borders

- **1px solid `--border`** (`#dde0dd`) is the default rule everywhere. Tables, cards, panels, input fields.
- `--border-strong` (`#b5bab7`) for the divider under table headers.
- `--border-accent` (`--teal`) on focused inputs and selected items.
- Cards can also use the **no-border + flat-fill** pattern (sunken or herb background, no stroke) — this is the Geigy treatment.

### Corner radii

Small and consistent. `--r-sm: 2px`, `--r-md: 4px`, `--r-lg: 8px`, `--r-xl: 14px`. Grade cells and pills use `--r-md`; cards use `--r-lg`; floating dropdowns / modals use `--r-xl`. **Nothing is fully rounded** except the potency-dot icon and range-slider thumbs.

### Cards

Three treatments:
1. **Paper card:** white fill, `1px --border`, `--shadow-md`, `--r-lg`. Default.
2. **Sunken card:** `--bg-sunken` fill, no border, no shadow, `--r-lg`. For ancillary info.
3. **Ink card:** `--ink` fill, `--paper` type. Header banners, footer, empty-state frames.

### Shadows

- `--shadow-sm` on subtle lifts (dropdown items, small chips).
- `--shadow-md` on standing cards.
- `--shadow-lg` on floating panels (autocomplete dropdown, detail panel).
- `--shadow-xl` on modals.
- `--ring-focus` (teal glow) on focused inputs — **replaces** the amber focus ring in the original codebase.

### Hover / press

- **Hover:** background shift only, no lift, no color change on text. Rows get `--ink-04`. Buttons get a one-step-deeper fill (e.g. `--ink` → `--ink-90`, `--teal` → `--teal-deep`). Tables get subtle row + column highlighting on hover (matrix pivot: both the row and column soft-tint).
- **Press:** no transform — the dense matrix makes scale changes feel unstable. Use a `--ring-focus` outline on keyboard focus, a 1px inset darker border on active.
- The existing table has a `hover:scale-110` on grade cells in the score row — **remove this** in the design system version; it's the one interaction that feels off-brand.

### Transparency & blur

Used sparingly. Modal backdrop: `rgba(21, 24, 23, 0.4)`. Disabled inputs: `--bg-sunken` fill. No blur effects — they fight the flat Geigy aesthetic.

### Motion

- Durations: **120/200/360ms**. 200ms is the default.
- Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)` (`--ease-out`) for everything entering; `ease-in-out` for toggles.
- Animations are limited to `fadeIn`, `slideUp`, and `pulse` (loading). No bounces, no spring overshoot.
- Respect `prefers-reduced-motion` — gate all transitions.

### Layout rules

- Max content width: **1400px**, centered, with 20px gutter. Matches the existing codebase.
- The **search banner + matrix + detail panels** stack vertically on desktop; detail splits into remedy + lecture side-by-side below 1024px-up, stacked below.
- Sticky column headers (remedy abbreviations, vertical text) and sticky first column (rubric names) are non-negotiable — the matrix is the product.
- Mobile: rubric column clamps to 50vw, vertical-text remedy headers stay vertical (the scroll is horizontal).

### Imagery

None in-product. If imagery is ever introduced, it should be **b&w or single-color**, high-contrast, with grain — aligned to the Geigy poster's photographic treatment. Never stock photography, never "wellness" imagery.

---

## Iconography

**System:** Lucide-style, 2px stroke, 24×24 viewBox, `fill="none"` + `stroke="currentColor"`, `stroke-linecap="round"`, `stroke-linejoin="round"`. This matches the icons already inline in the codebase (eye, eye-off, trash, chevron, settings gear, external-link, book, file-text, user).

**How to use:**
- Icons inherit text color (`currentColor`). Size them at `14–16px` inline in buttons, `18px` as standalone action icons.
- When an icon stands alone as a button target, wrap it in at least a `28×28` hit area.
- **No icon fonts** (Font Awesome, etc.) — they don't match the stroke style.
- **No emoji as icons.** The one existing 🔮 empty-state gets replaced with the `mark.svg`.

**Source recommendation:** Use **Lucide** (`lucide.dev`) via CDN for any icon not already inline in the codebase. It is the closest match to the existing hand-rolled SVGs and has ~1400 icons.

**CDN:** `https://unpkg.com/lucide@latest` — import as SVG sprite or use `<lucide-icon>` web component.

**Custom marks provided:**
- `assets/mark.svg` — the Homeo-Magic mark (concentric circles = potency/dilution)
- `assets/logo-lockup.svg` / `logo-lockup-inverse.svg` — full wordmark + mark
- `assets/potency-dot.svg` — single teal dot, used as bullet/favicon

**Unicode chars used as symbols:**
- `·` (middle dot) separates the words in the wordmark and replaces "•" as a generic inline separator
- `×` for close buttons (codebase already uses this)
- `—` em dash for captions and meta lines

---

## Flagged substitutions

These were not available and have been substituted — **please review**:

- **Carlito font files.** The codebase ships self-hosted woff2 files (`web/app/fonts/Carlito/Carlito-{Regular,Bold,Italic,BoldItalic}.woff2`); only the SIL OFL license file imports as text. This design system currently loads **Carlito from Google Fonts** via CDN — the same typeface, metric-identical. If you'd like the self-hosted files copied verbatim, re-attach them or point me at a download location.
- **Source Serif 4** is introduced as the serif for Materia Medica lecture text. The codebase uses `font-family: Georgia, 'Times New Roman', serif` as a system-serif fallback — Source Serif 4 is a more refined match for 1897 book typography. If you prefer Georgia, swap `--font-serif` in `colors_and_type.css`.

---

## Using this system

1. Link `colors_and_type.css` in every HTML surface.
2. Use the semantic classes (`.hm-h1`, `.hm-body`, `.hm-eyebrow`, `.hm-serif`, `.hm-quote`, `.hm-small`, `.hm-caption`) rather than re-specifying font/size.
3. Reference `assets/mark.svg` and `assets/logo-lockup.svg` instead of redrawing the logo.
4. For the matrix, copy the JSX components in `ui_kits/web/` — they already embed the pivot hover behavior, sticky scroll, and grade styling correctly.
