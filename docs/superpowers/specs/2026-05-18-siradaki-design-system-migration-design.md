# Sıradaki Design System — Full Migration

**Bundle:** `https://api.anthropic.com/v1/design/h/YfVCJTfpMPwxglH0-3jz4w`
**Bundle local:** `C:\Users\Emre\AppData\Local\Temp\design-pkg-YfVCJ\extracted\s-radaki-design-system\`
**Status:** master spec — decomposes into P0–P5 sub-plans

---

## 1. Goal

Replace the entire visual layer of Berber Randevu with the **Sıradaki Design System** (bundle artifact, 1:1 fidelity). Every surface inventoried in `DESIGN.md` is rebuilt against the bundle's `colors_and_type.css`, `ui_kits/mobile/*.jsx`, `ui_kits/web/*.html` and `assets/`. **No legacy CSS, theme tokens, palette names, brand patterns or microcopy survive.**

User directive (verbatim): *"birebir linkteki tasarımı implement etmeni istiyorum. hiçbir şekilde eski tasarım kullanılmayacak tamamen yeni tasarıma geçiş yapıyoruz"*.

## 2. Scope

### In scope

- Token foundation (mobile + web) lifted verbatim from `colors_and_type.css`
- Montserrat 400/500/600/700 web-font + native font loading
- Lucide icon library replacing `@expo/vector-icons` (mobile) and any existing web icons
- Brand assets (`mark.svg`, `logo.svg`, `mark-inverse.svg`, `logo-inverse.svg`)
- 14 shared mobile primitives + 5 shared web primitives (from `ui_kits/*/components.jsx`)
- 11 mobile screens (M1–M11) + their modals reskinned 1:1
- 5 web screens (W1, W2, W3, W3a form/loading/success/error, W4) reskinned 1:1
- All UI strings locked to `DESIGN.md` (Turkish "sen" form, exact casing)
- Removal of every banned pattern (see §7)

### Out of scope (separate work)

- Database, RPC, or edge-function changes
- Business logic rewrites (handlers, mutations, realtime channels stay)
- `apps/customer` mobile app — bundle's `DESIGN.md` does not inventory it
- New screens, new tabs, new features
- Accessibility audit beyond the 44px tap-target / focus-ring side-effects baked into the spec

## 3. Phase decomposition

The migration is too large for a single implementation plan. It is decomposed into six sequential sub-projects. Each phase gets its own `writing-plans` pass.

| Phase | Deliverable | Depends on |
|---|---|---|
| **P0 Foundation** | Tokens, fonts, brand assets, Lucide install, legacy purge | — |
| **P1 Primitives** | Shared component library (14 mobile + 5 web primitives) | P0 |
| **P2 Owner mobile** | M1, M2, M3, M4, M5, M6, M7 + AddAppointmentModal + StaffScheduleModal + inline modals | P1 |
| **P3 Staff mobile** | M8, M9, M10, M11 + AppointmentDetailSheet | P1 |
| **P4 Web booking** | W1, W2, W3, W3a (4 states), W4 + confirmation page | P1 |
| **P5 Microcopy lock** | `lib/strings.ts` per app, lint rule against inline UI strings, drift CI grep | P2, P3, P4 |

P0 and P1 may land in a single PR (foundation). P2–P4 land independently. P5 is final.

## 4. Token contract (P0)

The bundle's `colors_and_type.css` is **canonical**. Implementation lifts it verbatim into:

- **Web:** `apps/web/src/app/globals.css` — Tailwind directives prepended, then bundle CSS pasted in. No edits to color/spacing/radius/shadow/motion values.
- **Mobile:** `apps/mobile/lib/theme.ts` — TypeScript export named `T` containing every `--*` token translated to camelCase keys. `R` (radii), `S` (spacing), `Shadow` and `Motion` constants likewise derived.

Token surface (camelCase mobile, kebab-case web — same values):

- `ink900 #0B1220`, `ink800 #15192A`, `ink700 #1F2438`, `ink500 #3B4256`
- `slate700 #2F3649`, `slate500 #5B6477`, `slate400 #8590A4`, `slate300 #B4BBC8`, `slate200 #D6DBE5`, `slate100 #EEF1F5`, `slate50 #F7F8FA`, `slate0 #FFFFFF`
- `brand700 #15296B`, `brand600 #1E3A8A`, `brand500 #3B5BB8`, `brand100 #DDE3F2`
- `mint700 #008264`, `mint600 #00B894`, `mint100 #C6F3E5`
- `umber700 #503410`, `umber600 #6F4A14`, `umber100 #ECE6DC`
- `coral700 #7A1F2E`, `coral600 #A0303F`, `coral100 #EFD3D8`
- Semantic: `bg`, `bgElevated`, `bgSunken`, `fg1..fg4`, `fgOnInk`, `fgOnAccent`, `border`, `borderStrong`, `divider`, `accent`, `accentHover`, `accentTint`, `positive`, `warning`, `danger`, `focusRing`
- Spacing 0..10 (0, 4, 8, 12, 16, 20, 24, 32, 40, 56, 72)
- Radii: `xs 4, sm 8, md 12, lg 18, xl 24, pill 999`
- Shadows: `xs, sm, md, lg, inset` (recipes match bundle exactly)
- Motion: `easeOut, easeIn, easeSoft`, `durFast 120, durBase 200, durSlow 360`
- Type tokens: full Montserrat scale (`fsOverline 12 .. fsDisplayXl 64`), tracking (`trackOverline .16em, trackTight -.012em, trackDisplay -.02em`), line-heights (`lhTight 1.08, lhSnug 1.22, lhBase 1.45, lhLoose 1.6`)

Legacy aliases (`accent`, `accentSoft`, `aptBg`, `blockBg`, `redSoft`, `blueSoft`, `past`, `blockInk`, `avatarFrom`, `avatarTo`, `POLE_COLORS`, `eyebrow`, `pulse-dot`, `barber-pole`, `red`, `redBorder`, `blue`, `navy`, `surface`, `surfaceAlt`, `line`, `hairAlt`, `ink`, `muted`, `mutedAlt`, `danger` (old hex), `dangerSoft`) **are deleted**, not aliased forward.

## 5. Primitive library (P1)

### Mobile — `apps/mobile/components/ds/` (one file per primitive)

From `ui_kits/mobile/components.jsx`:

| Primitive | Responsibility | API surface |
|---|---|---|
| `OverlineHeader` | Screen-top overline + H1 + meta block | `overline, title, meta?` |
| `SectionLabel` | UPPERCASE tracked section title inside a screen | `children` |
| `Card` | Default surface (`slate0` bg, 12px radius, hairline, `shadowSm`) | `accent?, padded?, onPress?` |
| `KpiCard` | Özet's KPI tile (icon + label overline + tabular-num value) | `icon, label, value, accent?` |
| `AppointmentCard` | `upcoming` / `active` / `done` states | `state, time, duration, customer, service, onPress?` |
| `BlokCard` | Diagonal-hatch dashed-border blocked time | `time, duration, reason` |
| `StaffRow` | Name + status pill + meta + trailing slot | `name, status, meta, right?, onPress?` |
| `StatusPill` | `ok` (mint) / `warn` (umber) / `bad` (coral) / `neu` (slate) | `tone, children` |
| `Button` | 5 variants × 3 sizes (`primary, secondary, ghost, danger, link` × `sm, md, lg`) | `variant, size, full?, disabled?, onPress` |
| `TextField` | Overline label + 12px-radius input + helper/error slot | `label, value, onChange, placeholder?, secure?, helper?, error?` |
| `Chip` / `ChipRow` | Horizontal scrolling filter chips | `label, selected?, onPress` / `children` |
| `TabBar` | Bottom nav (5 owner / 3 staff), Lucide icons | `items[]` (with `lucide` name) |
| `Sheet` | Bottom modal with drag handle | `visible, onClose, children` |
| `DayPicker` | 7- or 14-day horizontal picker | `value, onChange, days` |

Every primitive imports only from `lib/theme.ts` (tokens) and `lucide-react-native` (icons). No business logic, no Supabase calls, no fetch.

### Web — `apps/web/src/components/ds/`

| Primitive | Responsibility |
|---|---|
| `Overline` | UPPERCASE 0.16em tracked label |
| `Card` | 12px-radius surface, hairline border, `shadowSm` |
| `Button` | Same variants as mobile (sizes adapted for web) |
| `StepHeader` | "Adım N · Title" composite used in BookingFlow |
| `BookingModal` | The 4-state form/loading/success/error overlay |

## 6. Per-screen migration (P2–P4)

Each screen's acceptance criteria is taken from `DESIGN.md` literally:

- Every overline, title, lead, label, placeholder, button, alert, empty-state string matches the strings spelled out in §M1–M11 / §W1–W4 of `DESIGN.md`.
- Every icon matches `assets/ICONOGRAPHY.md` Lucide names.
- Every screen uses **only** primitives from `components/ds/`. No ad-hoc styling.
- Realtime channels, RPCs, alerts, navigation logic — **unchanged**.

The per-screen plans (one per phase) will list file-level diffs and the exact `DESIGN.md` ID being implemented.

## 7. Hard rules — banned patterns

These are removed in P0 and never reintroduced:

- ❌ `barber-pole` CSS, `POLE_COLORS`, candy-cane / scissor / straight-razor / vintage-chrome motifs
- ❌ `pulse-dot` red pulsing element (the design uses the static mint dot or no marker)
- ❌ Legacy `eyebrow` class colored red (`#DC2626`) — replaced by `.overline` colored `--fg-3` slate-500
- ❌ Any `#DC2626`, `#FECACA`, `redSoft`, `redBorder` color usage — danger is `--coral-600 #A0303F`
- ❌ Any gradient (`linear-gradient`, `radial-gradient`) anywhere in the UI
- ❌ Emoji in UI strings
- ❌ Skeleton shimmer animations; bouncy springs; confetti
- ❌ "Siz" formal address; cute copy ("Hadi başlayalım!"); apologetic 404 ("😔")
- ❌ Mixed radii on one component (e.g. 16px card holding 8px input)
- ❌ Full-bleed photography behind UI

## 8. Decisions captured

| Topic | Decision | Reasoning |
|---|---|---|
| Tailwind | Kept | Pure utility layer for layout; tokens loaded via `:root`. Bundle is unopinionated about Tailwind. |
| RN icon library | `lucide-react-native` | Matches bundle's Lucide CDN choice 1:1. Tree-shakable. |
| Existing `Designs/00–12*.md` docs | Superseded by bundle `docs/00–12*.md` | Bundle ships canonical versions; repo copies will be replaced in P0 to avoid drift. |
| `apps/customer` mobile app | Out of scope this migration | Not inventoried in bundle `DESIGN.md`. Separate sprint after this one lands. |
| Commission widget visual | Reskinned within owner Settings (M6) | Bundle covers it as part of M6. |
| Brand mark sourcing | Bundle's `mark.svg` is canonical | Memory note says logo was flagged for review; user-directive says implement 1:1. |
| Montserrat licensing | OFL-licensed OTF files ship in `apps/{mobile,web}/assets/fonts/` | Already present in bundle. |
| Old `Designs/tokens.css` (if present) | Deleted | Single source of truth is `globals.css` (web) and `theme.ts` (mobile). |

## 9. Master acceptance criteria

The migration is "done" when every item below passes:

1. `apps/web/src/app/globals.css` contains the bundle's `colors_and_type.css` verbatim (after Tailwind directives). No legacy custom-property names.
2. `apps/mobile/lib/theme.ts` exports tokens whose hex values byte-match `colors_and_type.css`. Zero legacy alias names exported.
3. Grep across `apps/` returns 0 hits for: `barber-pole`, `pulse-dot`, `POLE_COLORS`, `DC2626`, `FECACA`, `eyebrow`, `accentSoft`, `aptBg`, `blockBg`.
4. Every screen ID in `DESIGN.md` (M1–M11, W1–W4, W3a) renders the strings spelled in `DESIGN.md` verbatim.
5. Every owner / staff screen uses only primitives from `apps/mobile/components/ds/`.
6. Every web screen uses only primitives from `apps/web/src/components/ds/`.
7. Tab bars (owner 5 / staff 3) render Lucide icons matching `assets/ICONOGRAPHY.md`.
8. Montserrat 400/500/600/700 is the only typeface used in screen text. System font appears only as final fallback in the stack.
9. The four banned color hexes (`#DC2626`, `#FECACA`, `#FEF2F2`, `#FFFFFF` only via tokens) and the banned pattern list in §7 produce zero violations.
10. All RPC/realtime/alert behavior matches `DESIGN.md` (logic-side untouched).

## 10. Order of operations

```
P0 Foundation ─┐
               ├─► single PR ("foundation")
P1 Primitives ─┘

P2 Owner mobile ──► PR
P3 Staff mobile ──► PR
P4 Web booking ───► PR
P5 Microcopy lock ► PR
```

Each PR ships with its own acceptance checklist drawn from the corresponding section of this spec.

## 11. Risks & open questions

| Item | Risk | Mitigation |
|---|---|---|
| Existing screens have inline styles, no ds layer | Large diff per screen | Land P0+P1 first; per-screen migration is mechanical replacement after primitives exist. |
| `apps/mobile` uses Expo SDK whose Lucide variant may differ | Native binding glitches | Pin `lucide-react-native` version, smoke-test tab bar on real device after P1. |
| Drag-drop on Ajanda (M4) uses `react-native-reanimated` gestures | Reskin must not break animation handles | Keep gesture handlers; replace only the visual layer of the dragged card. |
| Multi-shop refactor and customer-app sprints in flight (memory) | Merge conflicts | Foundation PR lands first to give other sprints the new tokens; each subsequent phase rebases. |
| EAS standalone build env vars (memory) | Font loading misconfigured in preview/prod | Add `expo-font` to EAS env config in P0; smoke-test preview build before P2 lands. |
| Customer mobile app reads tokens from `apps/mobile/lib/theme.ts` indirectly | Legacy key removal breaks customer app | `apps/customer` is out of scope but shares the mobile theme file — P0 will publish an `@ds/tokens` package both apps consume, with customer keeping its own alias map until its own migration sprint. |

---

**Next step after this master spec is approved:** write the P0 (Foundation) implementation plan via `superpowers:writing-plans`.
