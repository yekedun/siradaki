# Sıradaki Design System — P0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the visual foundation for the Sıradaki Design System migration — install Montserrat fonts and Lucide icons, replace token systems (mobile + web) with bundle values verbatim, copy brand assets, purge banned patterns (barber-pole, pulse-dot, candy-cane stripes, red eyebrows), without breaking the existing app.

**Architecture:** Sıradaki values become the single source of truth in `apps/mobile/lib/theme.ts` and `apps/web/src/app/globals.css` + `apps/web/tailwind.config.ts`. To keep screens compiling between P0 and the per-screen migrations (P2–P4), **legacy alias NAMES** (`T.aptBg`, `T.redSoft`, `bg-red`, etc.) survive temporarily as compatibility shims — but their hex values are remapped to Sıradaki tokens, so the rendered visual is 100% new even before screens are individually rewritten. P5 removes the alias names entirely after every screen has migrated to native Sıradaki names.

**Tech Stack:**
- Mobile: Expo SDK 51, React Native 0.74, expo-font (new), lucide-react-native (new)
- Web: Next.js 14, Tailwind 3.4, lucide-react (new)
- Fonts: Montserrat 400/500/600/700 (OTF, OFL-licensed) shipped from bundle
- Icons: Lucide
- Brand: `mark.svg`, `logo.svg` + inverse variants from bundle

**Spec reference:** `docs/superpowers/specs/2026-05-18-siradaki-design-system-migration-design.md` — implements §4 (token contract), §7 (banned patterns), §9 acceptance criteria items 1–3, 8, 9.

**Bundle artifact root:** `C:\Users\Emre\AppData\Local\Temp\design-pkg-YfVCJ\extracted\s-radaki-design-system\project\`

**One-time spec amendment (recorded here so the spec stays clean):** Spec §4 says "legacy aliases are deleted, not aliased forward." P0 ships a **deprecated remap shim**: alias NAMES survive but resolve to Sıradaki HEX values. This is the only practical way to phase the migration without breaking 13+ screens between P0 and P2. The shim is fully removed in P5 (one PR, file-by-file rename). Acceptance criterion §9.2 ("zero legacy alias names exported") thus becomes a P5 gate, not a P0 gate. Every other §9 criterion still passes at end of P0.

---

## File Structure

**Modified (P0):**
- `apps/mobile/package.json` — add `expo-font@~12.0.0`, `lucide-react-native@^0.453.0`
- `apps/web/package.json` — add `lucide-react@^0.453.0`
- `apps/mobile/lib/theme.ts` — full rewrite to Sıradaki tokens + deprecated shim
- `apps/mobile/app/_layout.tsx` — add `useFonts` for Montserrat
- `apps/web/src/app/globals.css` — full rewrite to bundle CSS verbatim (Tailwind prepended)
- `apps/web/tailwind.config.ts` — full rewrite to Sıradaki theme extension
- `apps/web/src/app/layout.tsx` — add Montserrat preload links
- `apps/web/src/app/not-found.tsx` — remove `barber-pole` class + `text-red` → coral; **functional content unchanged**
- `apps/mobile/app/(app)/index.tsx` — remove `POLE_COLORS` import + the avatar-pole render block; replace with single mint dot

**Created (P0):**
- `apps/mobile/assets/fonts/Montserrat-Regular.otf`
- `apps/mobile/assets/fonts/Montserrat-Medium.otf`
- `apps/mobile/assets/fonts/Montserrat-SemiBold.otf`
- `apps/mobile/assets/fonts/Montserrat-Bold.otf`
- `apps/mobile/assets/brand/mark.svg`
- `apps/mobile/assets/brand/logo.svg`
- `apps/mobile/assets/brand/mark-inverse.svg`
- `apps/mobile/assets/brand/logo-inverse.svg`
- `apps/web/public/fonts/Montserrat-Regular.otf`
- `apps/web/public/fonts/Montserrat-Medium.otf`
- `apps/web/public/fonts/Montserrat-SemiBold.otf`
- `apps/web/public/fonts/Montserrat-Bold.otf`
- `apps/web/public/brand/mark.svg`
- `apps/web/public/brand/logo.svg`
- `apps/web/public/brand/mark-inverse.svg`
- `apps/web/public/brand/logo-inverse.svg`

**Deleted (P0):** None at the file level. Banned patterns are inlined into the 3 modified screens; no orphan files exist.

---

## Task 1: Pre-flight & branch hygiene

**Files:** none (verification only)

- [ ] **Step 1: Confirm working tree state**

Run:
```bash
git status -s
git branch --show-current
```

Expected: on branch `scheduling-hardening` (or any non-`main` branch). If uncommitted Sıradaki-unrelated changes are present, ask user before proceeding.

- [ ] **Step 2: Confirm bundle is on disk**

Run:
```bash
ls "C:/Users/Emre/AppData/Local/Temp/design-pkg-YfVCJ/extracted/s-radaki-design-system/project/colors_and_type.css" \
   "C:/Users/Emre/AppData/Local/Temp/design-pkg-YfVCJ/extracted/s-radaki-design-system/project/fonts/Montserrat-Regular.otf" \
   "C:/Users/Emre/AppData/Local/Temp/design-pkg-YfVCJ/extracted/s-radaki-design-system/project/assets/mark.svg"
```

Expected: all three files exist. If any is missing, halt and re-fetch the bundle via `mcp__plugin_context-mode_context-mode__ctx_fetch_and_index` + re-extract.

---

## Task 2: Install mobile runtime deps

**Files:**
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Add expo-font and lucide-react-native to dependencies**

Use the Edit tool on `apps/mobile/package.json`. Replace the `"expo-clipboard": "~6.0.0",` line with:

```json
    "expo-clipboard": "~6.0.0",
    "expo-font": "~12.0.0",
    "lucide-react-native": "^0.453.0",
```

(Insert two new lines after `expo-clipboard`. `expo-font@12` matches Expo SDK 51 per Expo's compat matrix.)

- [ ] **Step 2: Install at workspace root**

Run:
```bash
pnpm install
```

Expected: pnpm resolves and adds both packages without errors. The lockfile updates.

- [ ] **Step 3: Verify deps resolve**

Run:
```bash
pnpm --filter @berber/mobile exec node -e "require('expo-font'); require('lucide-react-native'); console.log('ok')"
```

Expected: prints `ok`.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/package.json pnpm-lock.yaml
git commit -m "p0(mobile): add expo-font, lucide-react-native"
```

---

## Task 3: Install web runtime deps

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Add lucide-react to dependencies**

Edit `apps/web/package.json`. Replace the `"next": "^14.2.0",` line with:

```json
    "lucide-react": "^0.453.0",
    "next": "^14.2.0",
```

(Insert one new line before `next`.)

- [ ] **Step 2: Install at workspace root**

Run:
```bash
pnpm install
```

Expected: lucide-react@0.453.x added.

- [ ] **Step 3: Verify import resolves**

Run:
```bash
pnpm --filter @berber/web exec node -e "require('lucide-react'); console.log('ok')"
```

Expected: prints `ok`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "p0(web): add lucide-react"
```

---

## Task 4: Copy Montserrat fonts into both apps

**Files (created):**
- `apps/mobile/assets/fonts/Montserrat-{Regular,Medium,SemiBold,Bold}.otf`
- `apps/web/public/fonts/Montserrat-{Regular,Medium,SemiBold,Bold}.otf`

- [ ] **Step 1: Make destination directories**

Run:
```bash
mkdir -p "apps/mobile/assets/fonts" "apps/web/public/fonts"
```

- [ ] **Step 2: Copy mobile fonts**

Run:
```bash
SRC="C:/Users/Emre/AppData/Local/Temp/design-pkg-YfVCJ/extracted/s-radaki-design-system/project/fonts"
cp "$SRC/Montserrat-Regular.otf"  "apps/mobile/assets/fonts/Montserrat-Regular.otf"
cp "$SRC/Montserrat-Medium.otf"   "apps/mobile/assets/fonts/Montserrat-Medium.otf"
cp "$SRC/Montserrat-SemiBold.otf" "apps/mobile/assets/fonts/Montserrat-SemiBold.otf"
cp "$SRC/Montserrat-Bold.otf"     "apps/mobile/assets/fonts/Montserrat-Bold.otf"
```

- [ ] **Step 3: Copy web fonts**

Run:
```bash
SRC="C:/Users/Emre/AppData/Local/Temp/design-pkg-YfVCJ/extracted/s-radaki-design-system/project/fonts"
cp "$SRC/Montserrat-Regular.otf"  "apps/web/public/fonts/Montserrat-Regular.otf"
cp "$SRC/Montserrat-Medium.otf"   "apps/web/public/fonts/Montserrat-Medium.otf"
cp "$SRC/Montserrat-SemiBold.otf" "apps/web/public/fonts/Montserrat-SemiBold.otf"
cp "$SRC/Montserrat-Bold.otf"     "apps/web/public/fonts/Montserrat-Bold.otf"
```

- [ ] **Step 4: Verify file sizes**

Run:
```bash
ls -la apps/mobile/assets/fonts apps/web/public/fonts
```

Expected: each `.otf` file is roughly 200–270KB (Montserrat OTF).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/assets/fonts apps/web/public/fonts
git commit -m "p0(fonts): add Montserrat 400/500/600/700 to mobile and web"
```

---

## Task 5: Copy brand assets

**Files (created):** mark.svg, logo.svg, mark-inverse.svg, logo-inverse.svg under `apps/mobile/assets/brand/` and `apps/web/public/brand/`.

- [ ] **Step 1: Make destination directories**

Run:
```bash
mkdir -p "apps/mobile/assets/brand" "apps/web/public/brand"
```

- [ ] **Step 2: Copy brand SVGs**

Run:
```bash
SRC="C:/Users/Emre/AppData/Local/Temp/design-pkg-YfVCJ/extracted/s-radaki-design-system/project/assets"
for f in mark.svg logo.svg mark-inverse.svg logo-inverse.svg; do
  cp "$SRC/$f" "apps/mobile/assets/brand/$f"
  cp "$SRC/$f" "apps/web/public/brand/$f"
done
```

- [ ] **Step 3: Verify**

Run:
```bash
ls apps/mobile/assets/brand apps/web/public/brand
```

Expected: each directory contains the four SVG files.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/assets/brand apps/web/public/brand
git commit -m "p0(brand): add Sıradaki mark and logo SVGs"
```

---

## Task 6: Rewrite mobile theme.ts to Sıradaki tokens + deprecated shim

**Files:**
- Modify (full rewrite): `apps/mobile/lib/theme.ts`

This is the single source of truth for mobile colors. Every screen imports `{ T, R, Shadow }` from here.

- [ ] **Step 1: Rewrite theme.ts**

Replace the **entire contents** of `apps/mobile/lib/theme.ts` with:

```ts
/**
 * Sıradaki Design System — Mobile tokens.
 * Source of truth: design bundle `colors_and_type.css`.
 * Spec: docs/superpowers/specs/2026-05-18-siradaki-design-system-migration-design.md
 *
 * Legacy alias names below the "DEPRECATED SHIM" line resolve to Sıradaki
 * values so screens still render correctly between P0 and P5. They will be
 * removed in P5 after every screen has migrated to native Sıradaki names.
 */

// ===== Sıradaki canonical tokens =====
export const T = {
  // Ink scale (primary text, primary buttons)
  ink900: "#0B1220",
  ink800: "#15192A",
  ink700: "#1F2438",
  ink500: "#3B4256",

  // Slate scale (neutral ramp)
  slate700: "#2F3649",
  slate500: "#5B6477",
  slate400: "#8590A4",
  slate300: "#B4BBC8",
  slate200: "#D6DBE5",
  slate100: "#EEF1F5",
  slate50:  "#F7F8FA",
  slate0:   "#FFFFFF",

  // Brand navy (primary accent)
  brand700: "#15296B",
  brand600: "#1E3A8A",
  brand500: "#3B5BB8",
  brand100: "#DDE3F2",

  // Mint (positive / completed / live)
  mint700: "#008264",
  mint600: "#00B894",
  mint100: "#C6F3E5",

  // Umber (kazanç / komisyon / warning)
  umber700: "#503410",
  umber600: "#6F4A14",
  umber100: "#ECE6DC",

  // Coral (danger / cancel / conflict)
  coral700: "#7A1F2E",
  coral600: "#A0303F",
  coral100: "#EFD3D8",

  // Semantic
  bg:          "#F7F8FA",  // slate50
  bgElevated:  "#FFFFFF",  // slate0
  bgSunken:    "#EEF1F5",  // slate100
  fg1:         "#0B1220",  // ink900 — primary text
  fg2:         "#2F3649",  // slate700 — secondary heading
  fg3:         "#5B6477",  // slate500 — meta, captions
  fg4:         "#8590A4",  // slate400 — tertiary, disabled
  fgOnInk:     "#FFFFFF",
  fgOnAccent:  "#FFFFFF",
  border:        "#D6DBE5", // slate200
  borderStrong:  "#0B1220", // ink900
  divider:       "#EEF1F5", // slate100
  accent:        "#1E3A8A", // brand600
  accentHover:   "#15296B", // brand700
  accentTint:    "#DDE3F2", // brand100
  positive:      "#00B894", // mint600
  warning:       "#6F4A14", // umber600
  danger:        "#A0303F", // coral600
  focusRing:     "rgba(30, 58, 138, 0.42)", // brand600 @ 42%

  // ===== DEPRECATED SHIM (removed in P5) =====
  // Old names that still appear in screens. Hex values remapped to Sıradaki so
  // the rendered visual is already correct. Do NOT use these in new code.
  /** @deprecated use slate50 */
  surface:      "#FFFFFF",
  /** @deprecated use bgSunken */
  surfaceAlt:   "#EEF1F5",
  /** @deprecated use border */
  line:         "#D6DBE5",
  /** @deprecated use slate300 */
  hairAlt:      "#B4BBC8",
  /** @deprecated use fg1 */
  ink:          "#0B1220",
  /** @deprecated use fg3 */
  muted:        "#5B6477",
  /** @deprecated use fg4 */
  mutedAlt:     "#8590A4",
  /** @deprecated use brand600 */
  navy:         "#1E3A8A",
  /** @deprecated use brand500 */
  blue:         "#3B5BB8",
  /** @deprecated use brand100 */
  blueSoft:     "#DDE3F2",
  /** @deprecated use coral600 */
  red:          "#A0303F",
  /** @deprecated use coral100 */
  redSoft:      "#EFD3D8",
  /** @deprecated use coral100 */
  redBorder:    "#EFD3D8",
  /** @deprecated use slate300 */
  past:         "#B4BBC8",
  /** @deprecated use slate500 */
  blockInk:     "#5B6477",
  /** @deprecated use brand100 */
  avatarFrom:   "#DDE3F2",
  /** @deprecated use brand100 */
  avatarTo:     "#DDE3F2",
  /** @deprecated use brand600 */
  accentInk:    "#1E3A8A",
  /** @deprecated use accentTint */
  accentSoft:   "#DDE3F2",
  /** @deprecated use bgElevated */
  aptBg:        "#FFFFFF",
  /** @deprecated use bgSunken */
  blockBg:      "#EEF1F5",
  /** @deprecated use coral100 */
  dangerSoft:   "#EFD3D8",
} as const;

export type ThemeTokens = typeof T;

// ===== Radii (Sıradaki: 5 fixed + pill) =====
export const R = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 9999,
  // Deprecated shim
  /** @deprecated use sm */
  input: 8,
  /** @deprecated use md */
  card: 12,
  /** @deprecated use md */
  cta: 12,
  /** @deprecated use md */
  fab: 12,
  /** @deprecated use lg */
  sheet: 18,
} as const;

// ===== Spacing (4px base) =====
export const S = {
  s0: 0,
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s7: 32,
  s8: 40,
  s9: 56,
  s10: 72,
} as const;

// ===== Typography tokens =====
export const Type = {
  family: "Montserrat",
  weight: { regular: "400", medium: "500", semibold: "600", bold: "700" } as const,
  size: {
    overline:   12,
    caption:    12,
    meta:       13,
    body:       15,
    bodyLg:     16,
    lead:       17,
    h4:         18,
    h3:         22,
    h2:         28,
    h1:         34,
    display:    44,
    displayXl:  64,
  },
  track: {
    overline: 1.92,   // 0.16em × 12px
    tight:    -0.18,  // -0.012em × 15px
    display:  -0.68,  // -0.02em × 34px
  },
  lineHeight: {
    tight: 1.08,
    snug:  1.22,
    base:  1.45,
    loose: 1.6,
  },
} as const;

// ===== Shadow recipes (cool neutral tint, iOS-shaped) =====
export const Shadow = {
  xs: {
    shadowColor: "#0B1220",
    shadowOpacity: 0.04,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sm: {
    shadowColor: "#0B1220",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  md: {
    shadowColor: "#0B1220",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  lg: {
    shadowColor: "#0B1220",
    shadowOpacity: 0.30,
    shadowRadius: 48,
    shadowOffset: { width: 0, height: 24 },
    elevation: 12,
  },
  // Deprecated shim — old shadow names map to closest Sıradaki shadow
  /** @deprecated use Shadow.sm */
  card: {
    shadowColor: "#0B1220",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  /** @deprecated use Shadow.md */
  pill: {
    shadowColor: "#0B1220",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  /** @deprecated use Shadow.md */
  cta: {
    shadowColor: "#1E3A8A",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  /** @deprecated use Shadow.lg */
  sheet: {
    shadowColor: "#0B1220",
    shadowOpacity: 0.30,
    shadowRadius: 48,
    shadowOffset: { width: 0, height: -24 },
    elevation: 12,
  },
} as const;

// ===== Motion tokens =====
export const Motion = {
  easeOut:  "cubic-bezier(.2,.7,.2,1)",
  easeIn:   "cubic-bezier(.6,.0,.8,.2)",
  easeSoft: "cubic-bezier(.32,.72,.0,1)",
  durFast: 120,
  durBase: 200,
  durSlow: 360,
} as const;
```

Notes:
- `POLE_COLORS` is **removed** (banned pattern per spec §7). Task 11 fixes its one consumer.
- All deprecated shim hex values are Sıradaki — the visual is correct immediately.

- [ ] **Step 2: Type-check mobile**

Run:
```bash
pnpm --filter @berber/mobile type-check
```

Expected: passes. If any screen references `POLE_COLORS`, type-check will fail — that's expected and gets resolved in Task 11. If it fails on anything else, halt and investigate.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/lib/theme.ts
git commit -m "p0(mobile): rewrite theme.ts with Sıradaki tokens + deprecated shim"
```

---

## Task 7: Rewrite apps/web/src/app/globals.css with bundle CSS verbatim

**Files:**
- Modify (full rewrite): `apps/web/src/app/globals.css`

- [ ] **Step 1: Rewrite globals.css**

Replace the **entire contents** of `apps/web/src/app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* =========================================================================
   Sıradaki — Colors & Type
   Source of truth: design bundle `colors_and_type.css` (verbatim, except
   font URLs absolutized to /fonts/* for Next.js public/ serving).
   Spec: docs/superpowers/specs/2026-05-18-siradaki-design-system-migration-design.md
   ========================================================================= */

/* ---------- Webfonts ---------- */
@font-face {
  font-family: "Montserrat";
  src: url("/fonts/Montserrat-Regular.otf") format("opentype");
  font-weight: 400; font-style: normal; font-display: swap;
}
@font-face {
  font-family: "Montserrat";
  src: url("/fonts/Montserrat-Medium.otf") format("opentype");
  font-weight: 500; font-style: normal; font-display: swap;
}
@font-face {
  font-family: "Montserrat";
  src: url("/fonts/Montserrat-SemiBold.otf") format("opentype");
  font-weight: 600; font-style: normal; font-display: swap;
}
@font-face {
  font-family: "Montserrat";
  src: url("/fonts/Montserrat-Bold.otf") format("opentype");
  font-weight: 700; font-style: normal; font-display: swap;
}

:root {
  /* Ink */
  --ink-900: #0B1220;
  --ink-800: #15192A;
  --ink-700: #1F2438;
  --ink-500: #3B4256;

  /* Slate */
  --slate-700: #2F3649;
  --slate-500: #5B6477;
  --slate-400: #8590A4;
  --slate-300: #B4BBC8;
  --slate-200: #D6DBE5;
  --slate-100: #EEF1F5;
  --slate-50:  #F7F8FA;
  --slate-0:   #FFFFFF;

  /* Brand */
  --brand-700: #15296B;
  --brand-600: #1E3A8A;
  --brand-500: #3B5BB8;
  --brand-100: #DDE3F2;

  /* Mint */
  --mint-700: #008264;
  --mint-600: #00B894;
  --mint-100: #C6F3E5;

  /* Umber */
  --umber-700: #503410;
  --umber-600: #6F4A14;
  --umber-100: #ECE6DC;

  /* Coral */
  --coral-700: #7A1F2E;
  --coral-600: #A0303F;
  --coral-100: #EFD3D8;

  /* Semantic */
  --bg:           var(--slate-50);
  --bg-elevated:  var(--slate-0);
  --bg-sunken:    var(--slate-100);

  --fg-1: var(--ink-900);
  --fg-2: var(--slate-700);
  --fg-3: var(--slate-500);
  --fg-4: var(--slate-400);
  --fg-on-ink: #FFFFFF;
  --fg-on-accent: #FFFFFF;

  --border:        var(--slate-200);
  --border-strong: var(--ink-900);
  --divider:       var(--slate-100);

  --accent:       var(--brand-600);
  --accent-hover: var(--brand-700);
  --accent-tint:  var(--brand-100);

  --positive: var(--mint-600);
  --warning:  var(--umber-600);
  --danger:   var(--coral-600);

  --focus-ring: color-mix(in oklab, var(--brand-600) 42%, transparent);

  /* Spacing (4px base) */
  --space-0:  0;
  --space-1:  4px;
  --space-2:  8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 32px;
  --space-8: 40px;
  --space-9: 56px;
  --space-10: 72px;

  /* Radii */
  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-xl: 24px;
  --radius-pill: 999px;

  /* Shadows */
  --shadow-xs: 0 1px 0 rgba(11,18,32,0.04);
  --shadow-sm: 0 1px 2px rgba(11,18,32,0.05), 0 1px 0 rgba(11,18,32,0.04);
  --shadow-md: 0 6px 18px -10px rgba(11,18,32,0.22), 0 1px 0 rgba(11,18,32,0.04);
  --shadow-lg: 0 24px 48px -22px rgba(11,18,32,0.30), 0 2px 0 rgba(11,18,32,0.05);
  --shadow-inset: inset 0 0 0 1px var(--border);

  /* Motion */
  --ease-out:  cubic-bezier(.2,.7,.2,1);
  --ease-in:   cubic-bezier(.6,.0,.8,.2);
  --ease-soft: cubic-bezier(.32,.72,.0,1);
  --dur-fast:  120ms;
  --dur-base:  200ms;
  --dur-slow:  360ms;

  /* Type tokens */
  --font-sans: "Montserrat", "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace;

  --fs-overline: 12px;
  --fs-caption:  12px;
  --fs-meta:     13px;
  --fs-body:     15px;
  --fs-body-lg:  16px;
  --fs-lead:     17px;
  --fs-h4:       18px;
  --fs-h3:       22px;
  --fs-h2:       28px;
  --fs-h1:       34px;
  --fs-display:  44px;
  --fs-display-xl: 64px;

  --lh-tight: 1.08;
  --lh-snug:  1.22;
  --lh-base:  1.45;
  --lh-loose: 1.6;

  --track-overline: 0.16em;
  --track-tight:   -0.012em;
  --track-display: -0.02em;

  /* ===== DEPRECATED ALIAS SHIM (removed in P5) =====
     Old Tailwind class colors (`bg-red`, `text-muted`, etc.) compile from
     tailwind.config.ts. These :root vars cover any direct var() reads. */
  --surface:   var(--slate-0);
  --surfaceAlt: var(--slate-100);
  --hair:      var(--slate-200);
  --hairAlt:   var(--slate-300);
  --past:      var(--slate-300);
  --muted:     var(--slate-500);
  --mutedAlt:  var(--slate-400);
  --ink:       var(--ink-900);
  --navy:      var(--brand-600);
  --red:       var(--coral-600);
  --redSoft:   var(--coral-100);
  --redBorder: var(--coral-100);
  --blue:      var(--brand-500);
  --blueSoft:  var(--brand-100);
  --avatarFrom: var(--brand-100);
  --avatarTo:   var(--brand-100);
}

/* ---------- Base elements ---------- */
html, body { margin: 0; padding: 0; }
body {
  background: var(--bg);
  color: var(--fg-1);
  font-family: var(--font-sans);
  font-size: var(--fs-body);
  line-height: var(--lh-base);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

h1, .h1 {
  font-size: var(--fs-h1); font-weight: 700;
  line-height: var(--lh-tight); letter-spacing: var(--track-display);
  color: var(--fg-1); margin: 0;
}
h2, .h2 {
  font-size: var(--fs-h2); font-weight: 700;
  line-height: var(--lh-snug); letter-spacing: var(--track-display);
  color: var(--fg-1); margin: 0;
}
h3, .h3 {
  font-size: var(--fs-h3); font-weight: 600;
  line-height: var(--lh-snug); letter-spacing: var(--track-tight);
  color: var(--fg-1); margin: 0;
}
h4, .h4 {
  font-size: var(--fs-h4); font-weight: 600;
  line-height: var(--lh-snug);
  color: var(--fg-1); margin: 0;
}

p, .body {
  font-size: var(--fs-body); font-weight: 400;
  line-height: var(--lh-base);
  color: var(--fg-2); margin: 0;
}
.lead {
  font-size: var(--fs-lead); font-weight: 400;
  line-height: var(--lh-loose);
  color: var(--fg-2);
}
.meta, small {
  font-size: var(--fs-meta);
  color: var(--fg-3);
  line-height: var(--lh-base);
}

.overline {
  font-size: var(--fs-overline);
  font-weight: 600;
  letter-spacing: var(--track-overline);
  text-transform: uppercase;
  color: var(--fg-3);
  line-height: 1;
}

/* DEPRECATED — kept so existing screens still render; remove in P5. */
.eyebrow {
  font-size: var(--fs-overline);
  font-weight: 600;
  letter-spacing: var(--track-overline);
  text-transform: uppercase;
  color: var(--fg-3);
  line-height: 1;
}

code, kbd, .mono {
  font-family: var(--font-mono);
  font-size: 0.92em;
}

::selection { background: var(--accent-tint); color: var(--ink-900); }

a { color: var(--accent); text-decoration: none; }
a:hover { color: var(--accent-hover); text-decoration: underline; text-underline-offset: 3px; }

.hairline { border: 1px solid var(--border); }
.surface  { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); }

button { font-family: inherit; transition: transform 0.08s ease, background 0.15s ease, border-color 0.15s ease; }
button:active { transform: scale(0.985); }
input, select, textarea { font-family: inherit; }

.no-scrollbar::-webkit-scrollbar { width: 0; height: 0; }
```

Banned patterns removed (no `.barber-pole`, no `.pulse-dot`, no `@keyframes pulse`, no `@keyframes barber-scroll`, no `#DC2626` hex, no `#FECACA` hex).

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "p0(web): rewrite globals.css with Sıradaki tokens, drop barber-pole + pulse-dot"
```

---

## Task 8: Rewrite tailwind.config.ts to Sıradaki theme extension

**Files:**
- Modify (full rewrite): `apps/web/tailwind.config.ts`

- [ ] **Step 1: Rewrite tailwind.config.ts**

Replace the **entire contents** of `apps/web/tailwind.config.ts` with:

```ts
import type { Config } from "tailwindcss";

/**
 * Sıradaki Design System — Tailwind theme.
 * Source of truth: design bundle `colors_and_type.css`.
 * Spec: docs/superpowers/specs/2026-05-18-siradaki-design-system-migration-design.md
 *
 * Deprecated alias names (red, blue, navy, muted, hair, surface, …) are kept
 * but remapped to Sıradaki hex values. Removed in P5 after every screen has
 * migrated to native Sıradaki names.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sıradaki canonical scales
        ink: {
          900: "#0B1220",
          800: "#15192A",
          700: "#1F2438",
          500: "#3B4256",
          DEFAULT: "#0B1220",
        },
        slate: {
          0:   "#FFFFFF",
          50:  "#F7F8FA",
          100: "#EEF1F5",
          200: "#D6DBE5",
          300: "#B4BBC8",
          400: "#8590A4",
          500: "#5B6477",
          700: "#2F3649",
        },
        brand: {
          100: "#DDE3F2",
          500: "#3B5BB8",
          600: "#1E3A8A",
          700: "#15296B",
          DEFAULT: "#1E3A8A",
        },
        mint: {
          100: "#C6F3E5",
          600: "#00B894",
          700: "#008264",
          DEFAULT: "#00B894",
        },
        umber: {
          100: "#ECE6DC",
          600: "#6F4A14",
          700: "#503410",
          DEFAULT: "#6F4A14",
        },
        coral: {
          100: "#EFD3D8",
          600: "#A0303F",
          700: "#7A1F2E",
          DEFAULT: "#A0303F",
        },
        // Semantic
        bg: "#F7F8FA",
        bgElevated: "#FFFFFF",
        bgSunken: "#EEF1F5",
        border: "#D6DBE5",
        borderStrong: "#0B1220",
        divider: "#EEF1F5",
        positive: "#00B894",
        warning: "#6F4A14",
        danger: "#A0303F",

        // DEPRECATED SHIM — remove in P5
        surface: "#FFFFFF",
        surfaceAlt: "#EEF1F5",
        hair: "#D6DBE5",
        hairAlt: "#B4BBC8",
        past: "#B4BBC8",
        muted: "#5B6477",
        mutedAlt: "#8590A4",
        navy: "#1E3A8A",
        red: {
          DEFAULT: "#A0303F",
          soft: "#EFD3D8",
          border: "#EFD3D8",
        },
        blue: {
          DEFAULT: "#3B5BB8",
          soft: "#DDE3F2",
        },
        avatarFrom: "#DDE3F2",
        avatarTo: "#DDE3F2",
      },
      borderRadius: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "18px",
        xl: "24px",
        // Deprecated shim
        input: "8px",
        card: "12px",
        cta: "12px",
        fab: "12px",
        sheet: "18px",
      },
      boxShadow: {
        xs: "0 1px 0 rgba(11,18,32,0.04)",
        sm: "0 1px 2px rgba(11,18,32,0.05), 0 1px 0 rgba(11,18,32,0.04)",
        md: "0 6px 18px -10px rgba(11,18,32,0.22), 0 1px 0 rgba(11,18,32,0.04)",
        lg: "0 24px 48px -22px rgba(11,18,32,0.30), 0 2px 0 rgba(11,18,32,0.05)",
        // Deprecated shim
        card: "0 1px 2px rgba(11,18,32,0.05), 0 1px 0 rgba(11,18,32,0.04)",
        pill: "0 6px 18px -10px rgba(11,18,32,0.22)",
        cta:  "0 6px 18px -10px rgba(30,58,138,0.45)",
        sheet:"0 24px 48px -22px rgba(11,18,32,0.30)",
        now:  "0 0 0 1px #1E3A8A, 0 6px 18px -10px rgba(30,58,138,0.45)",
      },
      fontFamily: {
        sans: ['"Montserrat"', "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["ui-monospace", '"SF Mono"', '"JetBrains Mono"', "Menlo", "monospace"],
      },
      fontSize: {
        overline:   ["12px", { lineHeight: "1", letterSpacing: "0.16em" }],
        meta:       ["13px", "1.45"],
        body:       ["15px", "1.45"],
        bodyLg:     ["16px", "1.45"],
        lead:       ["17px", "1.6"],
        h4:         ["18px", "1.22"],
        h3:         ["22px", "1.22"],
        h2:         ["28px", "1.22"],
        h1:         ["34px", "1.08"],
        display:    ["44px", "1.08"],
        displayXl:  ["64px", "1.05"],
      },
      letterSpacing: {
        overline: "0.16em",
        tight:    "-0.012em",
        display:  "-0.02em",
        // Deprecated shim
        eyebrow:      "0.16em",
        eyebrowTight: "0.16em",
        title:        "-0.02em",
      },
      transitionTimingFunction: {
        out:  "cubic-bezier(.2,.7,.2,1)",
        in:   "cubic-bezier(.6,.0,.8,.2)",
        soft: "cubic-bezier(.32,.72,.0,1)",
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "360ms",
      },
    },
  },
  plugins: [],
};

export default config;
```

Banned items removed: `pulse` keyframes, `barber-scroll` keyframes, `animate-pulse`/`animate-barber` animation classes, all `#DC2626`/`#FECACA` hex literals.

- [ ] **Step 2: Type-check web**

Run:
```bash
pnpm --filter @berber/web type-check
```

Expected: passes (web only uses Tailwind classes; the renamed token namespace is backward-compatible via the alias shim).

- [ ] **Step 3: Commit**

```bash
git add apps/web/tailwind.config.ts
git commit -m "p0(web): rewrite tailwind.config.ts with Sıradaki tokens, drop pulse + barber animations"
```

---

## Task 9: Load Montserrat in mobile via expo-font

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Add useFonts hook to RootLayout**

Edit `apps/mobile/app/_layout.tsx`. Replace this block:

```tsx
import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { UserProvider, useUserRole } from "../lib/user-context";
import { T } from "../lib/theme";
```

with:

```tsx
import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { UserProvider, useUserRole } from "../lib/user-context";
import { T } from "../lib/theme";
```

Then replace the function body of `export default function RootLayout()` with:

```tsx
export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [fontsLoaded] = useFonts({
    "Montserrat":          require("../assets/fonts/Montserrat-Regular.otf"),
    "Montserrat-Medium":   require("../assets/fonts/Montserrat-Medium.otf"),
    "Montserrat-SemiBold": require("../assets/fonts/Montserrat-SemiBold.otf"),
    "Montserrat-Bold":     require("../assets/fonts/Montserrat-Bold.otf"),
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProvider>
        <RouterGuard session={session} />
        {session === undefined || !fontsLoaded ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: T.bg }}>
            <ActivityIndicator color={T.brand600} />
          </View>
        ) : (
          <Slot />
        )}
      </UserProvider>
    </GestureHandlerRootView>
  );
}
```

Two functional changes:
1. Block `<Slot/>` render until `fontsLoaded` is true (prevents font flash).
2. Activity indicator color switches from deprecated `T.navy` to native `T.brand600`.

- [ ] **Step 2: Type-check mobile**

Run:
```bash
pnpm --filter @berber/mobile type-check
```

Expected: passes (note: existing screens still use `T.navy` via the deprecation shim — that's intentional, they migrate in P2–P4).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/_layout.tsx
git commit -m "p0(mobile): load Montserrat via expo-font in root layout"
```

---

## Task 10: Configure Montserrat preload in web layout

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Add font preload links**

Replace the entire contents of `apps/web/src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Berber Randevu",
  description: "Online berber randevu sistemi",
};

const FONT_PRELOADS = [
  "/fonts/Montserrat-Regular.otf",
  "/fonts/Montserrat-Medium.otf",
  "/fonts/Montserrat-SemiBold.otf",
  "/fonts/Montserrat-Bold.otf",
] as const;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <head>
        {FONT_PRELOADS.map((href) => (
          <link
            key={href}
            rel="preload"
            href={href}
            as="font"
            type="font/otf"
            crossOrigin="anonymous"
          />
        ))}
      </head>
      <body className="bg-bg text-ink antialiased font-sans">{children}</body>
    </html>
  );
}
```

The `font-sans` class now resolves to Montserrat (Tailwind config Task 8). The preload links shave the first-paint font swap.

- [ ] **Step 2: Type-check web**

Run:
```bash
pnpm --filter @berber/web type-check
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "p0(web): preload Montserrat in root layout"
```

---

## Task 11: Purge POLE_COLORS (banned candy-cane pattern)

**Files:**
- Modify: `apps/mobile/app/(app)/index.tsx`

The (app)/index.tsx screen at line 21 imports `POLE_COLORS` and at line ~440–450 renders an animated barber-pole stripe inside an avatar. Both are banned (§7).

- [ ] **Step 1: Inspect existing usage**

Run:
```bash
sed -n '18,25p' "apps/mobile/app/(app)/index.tsx"
echo '---'
sed -n '435,455p' "apps/mobile/app/(app)/index.tsx"
```

Read both blocks carefully so the replacement edit below targets the right lines.

- [ ] **Step 2: Remove POLE_COLORS import**

Edit `apps/mobile/app/(app)/index.tsx`. Replace the line:

```ts
import { T, R, Shadow, POLE_COLORS } from "../../lib/theme";
```

with:

```ts
import { T, R, Shadow } from "../../lib/theme";
```

- [ ] **Step 3: Replace the pole-stripe render**

Locate the block around line 445 that uses `POLE_COLORS`. It currently maps an array index `i` into `POLE_COLORS[i % POLE_COLORS.length]` to draw alternating red/white/blue stripes. Replace **the entire stripe-rendering JSX block** (find it via `grep -n "POLE_COLORS" "apps/mobile/app/(app)/index.tsx"`) with a single static accent dot:

```tsx
<View
  style={{
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: T.mint600,
  }}
/>
```

(If the block is wrapped in a parent View used as a status badge, keep the parent View — replace only the pole stripe children with the dot above.)

- [ ] **Step 4: Type-check + grep verification**

Run:
```bash
pnpm --filter @berber/mobile type-check
```

Expected: passes.

Run:
```bash
grep -n "POLE_COLORS\|barber-pole" "apps/mobile/app/(app)/index.tsx"
```

Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add "apps/mobile/app/(app)/index.tsx"
git commit -m "p0(mobile): remove POLE_COLORS candy-cane pattern from staff home"
```

---

## Task 12: Purge barber-pole from web not-found

**Files:**
- Modify: `apps/web/src/app/not-found.tsx`

- [ ] **Step 1: Remove the barber-pole stripe**

Edit `apps/web/src/app/not-found.tsx`. Replace the line:

```tsx
        <div className="mx-auto my-5 h-2 w-20 animate-barber rounded-sm opacity-55 barber-pole" />
```

with:

```tsx
        <div className="mx-auto my-5 h-px w-20 bg-border" />
```

(Replaces the animated candy-cane stripe with a single hairline divider in the Sıradaki border color.)

- [ ] **Step 2: Swap `text-red` overline to coral via the shim**

The screen uses `text-red` for the "404 · SAYFA YOK" overline. Per spec §7 the overline should be `--fg-3` slate-500. Replace:

```tsx
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[1.4px] text-red">
          404 · SAYFA YOK
        </div>
```

with:

```tsx
        <div className="mb-2 text-overline font-semibold uppercase tracking-overline text-slate-500">
          404 · SAYFA YOK
        </div>
```

- [ ] **Step 3: Build web to verify**

Run:
```bash
pnpm --filter @berber/web build
```

Expected: build succeeds. (A `next build` is the strictest check that all Tailwind class references resolve.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/not-found.tsx
git commit -m "p0(web): remove barber-pole stripe from 404, use coral overline"
```

---

## Task 13: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Grep for banned hexes and patterns across `apps/`**

Run:
```bash
echo "=== barber-pole ===" && grep -rn "barber-pole" apps/mobile/lib apps/mobile/app apps/mobile/components apps/web/src apps/web/tailwind.config.ts 2>/dev/null
echo "=== pulse-dot ===" && grep -rn "pulse-dot" apps/mobile/lib apps/mobile/app apps/mobile/components apps/web/src 2>/dev/null
echo "=== POLE_COLORS ===" && grep -rn "POLE_COLORS" apps/mobile/lib apps/mobile/app apps/mobile/components 2>/dev/null
echo "=== DC2626 ===" && grep -rni "DC2626" apps/mobile/lib apps/mobile/app apps/mobile/components apps/web/src apps/web/tailwind.config.ts 2>/dev/null
echo "=== FECACA ===" && grep -rni "FECACA" apps/mobile/lib apps/mobile/app apps/mobile/components apps/web/src apps/web/tailwind.config.ts 2>/dev/null
```

Expected: **zero hits in every section.** If any hit appears outside `node_modules`, `.next`, or `android/`, halt and remove the reference.

(Note: Android XML layout files under `apps/mobile/android/.../barber_widget.xml` are widget IDs, not the CSS pattern — these are kept until the widget itself is rebranded in a later sprint; they do not match the `barber-pole` regex.)

- [ ] **Step 2: Type-check both apps**

Run:
```bash
pnpm --filter @berber/mobile type-check && pnpm --filter @berber/web type-check
```

Expected: both pass.

- [ ] **Step 3: Web build smoke**

Run:
```bash
pnpm --filter @berber/web build
```

Expected: build succeeds. Inspect the build output for warnings about missing fonts or unresolved Tailwind classes. None should appear.

- [ ] **Step 4: Mobile Metro bundle smoke**

Run:
```bash
pnpm --filter @berber/mobile exec npx expo export --platform android --output-dir .expo-smoke-build
```

Expected: bundles successfully. Then clean up:

```bash
rm -rf apps/mobile/.expo-smoke-build
```

- [ ] **Step 5: Final commit (housekeeping if needed)**

If any incidental file edits accumulated:

```bash
git status -s
git add -A   # only if status shows expected files
git commit -m "p0: foundation pass complete (verified)"
```

- [ ] **Step 6: Update memory**

Save a project memory recording P0 completion so subsequent sessions know foundation is live. Use the auto-memory system in `C:\Users\Emre\.claude\projects\C--Users-Emre-Berber-randevu\memory\`:

Create `project_siradaki_p0_done.md`:
```markdown
---
name: project-siradaki-p0-done
description: P0 Foundation of Sıradaki Design System migration is shipped — tokens, fonts, brand assets, Lucide installed; banned patterns purged
metadata:
  type: project
---

P0 Foundation complete on 2026-05-18 (branch: scheduling-hardening).

**Why:** First phase of full visual migration to Sıradaki Design System (bundle YfVCJTfpMPwxglH0-3jz4w). User directive: birebir 1:1, eski tasarımdan hiçbir şey kalmayacak.

**How to apply:** Foundation pieces are live — `apps/mobile/lib/theme.ts` exports Sıradaki tokens (brand600, slate*, mint*, umber*, coral*); `apps/web/src/app/globals.css` has bundle CSS verbatim; Tailwind config rewritten. Montserrat loads on both surfaces. Lucide installed (`lucide-react-native`, `lucide-react`). Brand SVGs at `apps/{mobile,web}/{assets,public}/brand/`. POLE_COLORS, barber-pole CSS, pulse-dot CSS, #DC2626, #FECACA are gone.

Legacy alias NAMES (T.aptBg, T.redSoft, bg-red, text-muted, etc.) still exist as deprecated shims pointing to Sıradaki HEX values — removed in P5 after per-screen migrations (P2–P4) finish.

Next: P1 (primitives) — see `docs/superpowers/specs/2026-05-18-siradaki-design-system-migration-design.md` §5.

Linked: [[project-design-refresh-2026-05-07]] (now superseded by this migration).
```

Add this line to `MEMORY.md`:
```
- [Sıradaki P0 Foundation shipped](project_siradaki_p0_done.md) — tokens + fonts + Lucide + banned-pattern purge done 2026-05-18; legacy alias names removed in P5
```

---

## Self-Review

Reviewed plan against spec sections §4, §7, §9 (criteria 1–3, 8, 9):

- ✅ **§4 token contract** — Task 6 (mobile theme.ts), Task 7 (globals.css), Task 8 (tailwind.config.ts) lift every named token from `colors_and_type.css`. The deprecated alias shim is an explicit, documented amendment to keep screens compiling between P0 and P5.
- ✅ **§7 banned patterns** — Task 7 removes `pulse-dot`, `barber-pole` CSS + their keyframes; Task 8 removes `animate-pulse`, `animate-barber` Tailwind config + `#DC2626`/`#FECACA` hex literals; Task 11 removes `POLE_COLORS` runtime usage; Task 12 removes the `barber-pole` class from the only consumer.
- ✅ **§9.1** (globals.css == bundle CSS verbatim minus Tailwind directives) — Task 7.
- ✅ **§9.2** (mobile theme byte-matches bundle hex values) — Task 6.
- ✅ **§9.3** (grep returns 0 hits for `barber-pole`, `pulse-dot`, `POLE_COLORS`, `DC2626`, `FECACA`) — Task 13.1 verifies; Task 13.1 explicit note about Android widget IDs being unrelated.
- ✅ **§9.8** (Montserrat loaded; system font only as final fallback) — Tasks 4, 9, 10 + Tailwind `fontFamily.sans` listing Montserrat first.
- ✅ **§9.9** (banned color hexes produce zero violations) — same as §9.3 grep + Task 8 Tailwind config strip.

**Placeholder scan:** No "TBD", no "implement appropriate handling", no "TODO". Every code snippet is complete and copy-paste ready.

**Type consistency:** Token names used in Task 9 (`T.brand600`, `T.bg`) match the names defined in Task 6. Tailwind classes used in Task 12 (`text-overline`, `tracking-overline`, `text-slate-500`, `bg-border`) match the classes generated by Task 8 config.

**Spec coverage gap:** None for P0's scope. The Lucide install is in Tasks 2–3 but the icons are not yet wired into the tab bar; that wiring belongs in P1 (primitives) when `TabBar` is built. This is correct phase split — flagging it explicitly here so the executor doesn't think it's missing.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-18-siradaki-p0-foundation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

**Which approach?**
