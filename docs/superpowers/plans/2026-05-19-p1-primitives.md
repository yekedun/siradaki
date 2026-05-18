# P1 Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the Sıradaki design-system primitive component libraries for mobile (14 components) and web (10 components), replacing all ad-hoc styling with token-backed, bundle-faithful components.

**Architecture:** Each primitive lives in `apps/mobile/components/ds/` or `apps/web/src/components/ds/`, imports only from `lib/theme.ts` (mobile) or Tailwind + CSS variables (web), has no business logic, and is re-exported via a barrel `index.ts`. Existing screen files are NOT touched in P1 — that migration happens in P2–P4.

**Tech Stack:** React Native (Expo SDK 51), TypeScript, `lucide-react-native@^0.453.0`, `apps/mobile/lib/theme.ts` tokens, Next.js 14, Tailwind CSS, `lucide-react@^0.453.0`, CSS custom properties from `globals.css`.

**Design reference (canonical):**
- Bundle mobile: `C:/Users/Emre/AppData/Local/Temp/design-pkg-YfVCJ/extracted/s-radaki-design-system/project/ui_kits/mobile/components.jsx`
- Bundle web: `C:/Users/Emre/AppData/Local/Temp/design-pkg-YfVCJ/extracted/s-radaki-design-system/project/ui_kits/web/components.jsx`
- Tokens spec: `docs/superpowers/specs/2026-05-18-siradaki-design-system-migration-design.md` §4–5

---

## File Map

### Mobile — create
| File | Component(s) |
|---|---|
| `apps/mobile/components/ds/StatusPill.tsx` | `StatusPill` |
| `apps/mobile/components/ds/Button.tsx` | `Button` |
| `apps/mobile/components/ds/TextField.tsx` | `TextField` |
| `apps/mobile/components/ds/Chip.tsx` | `Chip`, `ChipRow` |
| `apps/mobile/components/ds/Card.tsx` | `Card` |
| `apps/mobile/components/ds/KpiCard.tsx` | `KpiCard` |
| `apps/mobile/components/ds/AppointmentCard.tsx` | `AppointmentCard` |
| `apps/mobile/components/ds/BlokCard.tsx` | `BlokCard` |
| `apps/mobile/components/ds/StaffRow.tsx` | `StaffRow` |
| `apps/mobile/components/ds/OverlineHeader.tsx` | `OverlineHeader` |
| `apps/mobile/components/ds/SectionLabel.tsx` | `SectionLabel` |
| `apps/mobile/components/ds/TabBar.tsx` | `TabBar` |
| `apps/mobile/components/ds/Sheet.tsx` | `Sheet` |
| `apps/mobile/components/ds/DayPicker.tsx` | `DayPicker` |
| `apps/mobile/components/ds/index.ts` | barrel re-export |

### Web — create
| File | Component(s) |
|---|---|
| `apps/web/src/components/ds/Overline.tsx` | `Overline` |
| `apps/web/src/components/ds/Card.tsx` | `Card` |
| `apps/web/src/components/ds/Button.tsx` | `Button` |
| `apps/web/src/components/ds/StepHeader.tsx` | `StepHeader` |
| `apps/web/src/components/ds/ProfileCard.tsx` | `ProfileCard` |
| `apps/web/src/components/ds/ServiceRow.tsx` | `ServiceRow` |
| `apps/web/src/components/ds/StaffPicker.tsx` | `StaffPicker` |
| `apps/web/src/components/ds/DateRail.tsx` | `DateRail` |
| `apps/web/src/components/ds/SlotGrid.tsx` | `SlotGrid` |
| `apps/web/src/components/ds/BookButton.tsx` | `BookButton` |
| `apps/web/src/components/ds/BookingModalShell.tsx` | `BookingModalShell` (pure-UI 4-state overlay) |
| `apps/web/src/components/ds/WebField.tsx` | `WebField` |
| `apps/web/src/components/ds/NotFoundScreen.tsx` | `NotFoundScreen` |
| `apps/web/src/components/ds/index.ts` | barrel re-export |

---

## Task 1: Mobile ds directory + StatusPill + SectionLabel

**Files:**
- Create: `apps/mobile/components/ds/StatusPill.tsx`
- Create: `apps/mobile/components/ds/SectionLabel.tsx`

- [ ] **Step 1: Create StatusPill**

```tsx
// apps/mobile/components/ds/StatusPill.tsx
import { Text, StyleSheet } from "react-native";
import { T, Type } from "../../lib/theme";

type Tone = "ok" | "warn" | "bad" | "neu";

interface StatusPillProps {
  tone?: Tone;
  children: React.ReactNode;
}

const toneMap: Record<Tone, { bg: string; fg: string }> = {
  ok:   { bg: T.mint100,  fg: T.mint700  },
  warn: { bg: T.umber100, fg: T.umber700 },
  bad:  { bg: T.coral100, fg: T.coral700 },
  neu:  { bg: T.slate100, fg: T.fg2      },
};

export function StatusPill({ tone = "ok", children }: StatusPillProps) {
  const { bg, fg } = toneMap[tone];
  return (
    <Text style={[styles.pill, { backgroundColor: bg, color: fg }]}>
      {String(children).toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  pill: {
    fontSize: 10,
    fontFamily: Type.family,
    fontWeight: Type.weight.bold,
    letterSpacing: 1.4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
});
```

- [ ] **Step 2: Create SectionLabel**

```tsx
// apps/mobile/components/ds/SectionLabel.tsx
import { Text, StyleSheet, ViewStyle } from "react-native";
import { T, Type, S } from "../../lib/theme";

interface SectionLabelProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function SectionLabel({ children, style }: SectionLabelProps) {
  return (
    <Text style={[styles.label, style]}>
      {String(children).toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontFamily: Type.family,
    fontWeight: Type.weight.semibold,
    letterSpacing: 1.76,
    color: T.slate500,
    paddingHorizontal: S.s5,
    marginTop: S.s6,
    marginBottom: S.s2 + 2,
  },
});
```

- [ ] **Step 3: Type-check**

```bash
cd apps/mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: no errors in the new files.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/components/ds/StatusPill.tsx apps/mobile/components/ds/SectionLabel.tsx
git commit -m "p1(mobile): add StatusPill and SectionLabel ds primitives"
```

---

## Task 2: Mobile Button + TextField + Chip

**Files:**
- Create: `apps/mobile/components/ds/Button.tsx`
- Create: `apps/mobile/components/ds/TextField.tsx`
- Create: `apps/mobile/components/ds/Chip.tsx`

- [ ] **Step 1: Create Button**

```tsx
// apps/mobile/components/ds/Button.tsx
import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import { T, R, Type } from "../../lib/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  onPress?: () => void;
  full?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const variantMap: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary:   { bg: T.ink900,    fg: T.fgOnInk,   border: T.ink900    },
  accent:    { bg: T.brand600,  fg: T.fgOnAccent, border: T.brand700  },
  secondary: { bg: "transparent", fg: T.ink900,   border: T.ink900    },
  ghost:     { bg: "transparent", fg: T.ink900,   border: "transparent" },
  danger:    { bg: "transparent", fg: T.coral600, border: T.coral600  },
};

const sizeMap: Record<Size, { height: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { height: 34, paddingHorizontal: 12, fontSize: 13 },
  md: { height: 44, paddingHorizontal: 18, fontSize: 14 },
  lg: { height: 52, paddingHorizontal: 20, fontSize: 15 },
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  onPress,
  full = false,
  disabled = false,
  style,
}: ButtonProps) {
  const v = variantMap[variant];
  const s = sizeMap[size];
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.paddingHorizontal,
          backgroundColor: v.bg,
          borderColor: v.border,
          alignSelf: full ? "stretch" : "flex-start",
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { fontSize: s.fontSize, color: v.fg }]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: R.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  label: {
    fontFamily: Type.family,
    fontWeight: Type.weight.semibold,
    letterSpacing: -0.07,
  },
});
```

- [ ] **Step 2: Create TextField**

```tsx
// apps/mobile/components/ds/TextField.tsx
import { View, Text, TextInput, StyleSheet } from "react-native";
import { T, R, Type, S } from "../../lib/theme";

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  helper?: string;
  error?: string;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  secure = false,
  helper,
  error,
}: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={T.fg4}
        secureTextEntry={secure}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {(helper || error) && (
        <Text style={error ? styles.errorText : styles.helperText}>
          {error ?? helper}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: S.s1 + 2 },
  label: {
    fontSize: 11,
    fontFamily: Type.family,
    fontWeight: Type.weight.semibold,
    letterSpacing: 1.76,
    color: T.slate500,
  },
  input: {
    fontFamily: Type.family,
    fontSize: 15,
    color: T.fg1,
    backgroundColor: T.bgElevated,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: T.coral600,
  },
  helperText: {
    fontSize: 12,
    fontFamily: Type.family,
    color: T.fg3,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Type.family,
    color: T.coral600,
  },
});
```

- [ ] **Step 3: Create Chip + ChipRow**

```tsx
// apps/mobile/components/ds/Chip.tsx
import { Pressable, Text, ScrollView, StyleSheet, ViewStyle } from "react-native";
import { T, R, Type, S } from "../../lib/theme";

interface ChipProps {
  children: React.ReactNode;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ children, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? T.ink900 : T.bgElevated,
          borderColor: selected ? T.ink900 : T.border,
        },
      ]}
    >
      <Text style={[styles.label, { color: selected ? T.fgOnInk : T.fg1 }]}>
        {children}
      </Text>
    </Pressable>
  );
}

interface ChipRowProps {
  children: React.ReactNode;
  padded?: boolean;
  style?: ViewStyle;
}

export function ChipRow({ children, padded = true, style }: ChipRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.row,
        padded ? { paddingHorizontal: S.s5 } : null,
      ]}
      style={style}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: R.pill,
    borderWidth: 1,
    marginRight: S.s2,
  },
  label: {
    fontFamily: Type.family,
    fontWeight: Type.weight.semibold,
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    paddingVertical: S.s1,
  },
});
```

- [ ] **Step 4: Type-check**

```bash
cd apps/mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: no errors in new files.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/ds/Button.tsx apps/mobile/components/ds/TextField.tsx apps/mobile/components/ds/Chip.tsx
git commit -m "p1(mobile): add Button, TextField, Chip+ChipRow ds primitives"
```

---

## Task 3: Mobile Card + KpiCard

**Files:**
- Create: `apps/mobile/components/ds/Card.tsx`
- Create: `apps/mobile/components/ds/KpiCard.tsx`

- [ ] **Step 1: Create Card**

```tsx
// apps/mobile/components/ds/Card.tsx
import { Pressable, View, StyleSheet, ViewStyle } from "react-native";
import { T, R, Shadow } from "../../lib/theme";

interface CardProps {
  children: React.ReactNode;
  accent?: boolean;
  padded?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({
  children,
  accent = false,
  padded = true,
  onPress,
  style,
}: CardProps) {
  const Container = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: accent ? T.brand600 : T.bgElevated,
          borderColor: accent ? T.brand700 : T.border,
          padding: padded ? 16 : 0,
        },
        Shadow.sm,
        style,
      ]}
    >
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: R.md,
    borderWidth: 1,
  },
});
```

- [ ] **Step 2: Create KpiCard**

```tsx
// apps/mobile/components/ds/KpiCard.tsx
import { View, Text, StyleSheet } from "react-native";
import { T, Type } from "../../lib/theme";
import { Card } from "./Card";

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  accent?: boolean;
}

export function KpiCard({ label, value, unit, sub, accent = false }: KpiCardProps) {
  const metaColor = accent ? "rgba(255,255,255,0.65)" : T.slate500;
  const valueColor = accent ? T.fgOnAccent : T.ink900;
  return (
    <Card accent={accent} style={styles.card}>
      <Text style={[styles.label, { color: metaColor }]}>
        {label.toUpperCase()}
      </Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
        {unit && (
          <Text style={[styles.unit, { color: metaColor }]}>{unit}</Text>
        )}
      </View>
      {sub && <Text style={[styles.sub, { color: metaColor }]}>{sub}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1 },
  label: {
    fontSize: 10,
    fontFamily: Type.family,
    fontWeight: Type.weight.semibold,
    letterSpacing: 1.6,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 10,
    gap: 4,
  },
  value: {
    fontSize: 28,
    fontFamily: Type.family,
    fontWeight: Type.weight.bold,
    letterSpacing: -0.56,
    lineHeight: 28,
  },
  unit: {
    fontSize: 12,
    fontFamily: Type.family,
    fontWeight: Type.weight.semibold,
    letterSpacing: 1.44,
    marginBottom: 2,
  },
  sub: {
    fontSize: 11,
    fontFamily: Type.family,
    marginTop: 6,
  },
});
```

- [ ] **Step 3: Type-check**

```bash
cd apps/mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/components/ds/Card.tsx apps/mobile/components/ds/KpiCard.tsx
git commit -m "p1(mobile): add Card and KpiCard ds primitives"
```

---

## Task 4: Mobile AppointmentCard + BlokCard

**Files:**
- Create: `apps/mobile/components/ds/AppointmentCard.tsx`
- Create: `apps/mobile/components/ds/BlokCard.tsx`

- [ ] **Step 1: Create AppointmentCard**

```tsx
// apps/mobile/components/ds/AppointmentCard.tsx
import { Pressable, View, Text, StyleSheet } from "react-native";
import { T, R, Type, S, Shadow } from "../../lib/theme";

type State = "upcoming" | "active" | "done";

interface AppointmentCardProps {
  time: string;
  duration: number;
  customer: string;
  service: string;
  state?: State;
  onPress?: () => void;
}

const stateMap: Record<State, {
  bg: string; border: string; text: string; sub: string; opacity: number; strike: boolean;
}> = {
  upcoming: { bg: T.bgElevated, border: T.border,    text: T.fg1,        sub: T.slate500,             opacity: 1,    strike: false },
  active:   { bg: T.brand600,   border: T.brand700,  text: T.fgOnAccent, sub: "rgba(255,255,255,0.6)", opacity: 1,    strike: false },
  done:     { bg: T.bgElevated, border: T.border,    text: T.fg1,        sub: T.slate500,             opacity: 0.55, strike: true  },
};

export function AppointmentCard({
  time,
  duration,
  customer,
  service,
  state = "upcoming",
  onPress,
}: AppointmentCardProps) {
  const v = stateMap[state];
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: v.bg, borderColor: v.border, opacity: v.opacity },
        Shadow.xs,
      ]}
    >
      <View style={styles.timeCol}>
        <Text style={[styles.time, { color: v.text }]}>{time}</Text>
        <Text style={[styles.dur, { color: v.sub }]}>{duration} DK</Text>
      </View>
      <View style={styles.infoCol}>
        <Text
          style={[styles.customer, { color: v.text, textDecorationLine: v.strike ? "line-through" : "none" }]}
          numberOfLines={1}
        >
          {customer}
        </Text>
        <Text style={[styles.service, { color: v.sub }]} numberOfLines={1}>
          {service}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: R.md,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  timeCol: { minWidth: 56 },
  time: {
    fontSize: 14,
    fontFamily: Type.family,
    fontWeight: Type.weight.bold,
    lineHeight: 14,
  },
  dur: {
    fontSize: 10,
    fontFamily: Type.family,
    fontWeight: Type.weight.semibold,
    letterSpacing: 1.4,
    marginTop: 5,
  },
  infoCol: { flex: 1 },
  customer: {
    fontSize: 15,
    fontFamily: Type.family,
    fontWeight: Type.weight.semibold,
    lineHeight: 18,
  },
  service: {
    fontSize: 12,
    fontFamily: Type.family,
    marginTop: 2,
  },
});
```

- [ ] **Step 2: Create BlokCard**

Note: The bundle uses a diagonal CSS gradient (banned by spec §7). Mobile version uses `bgSunken` fill with dashed border — visually conveys "blocked time" without a gradient.

```tsx
// apps/mobile/components/ds/BlokCard.tsx
import { View, Text, StyleSheet } from "react-native";
import { T, R, Type, S } from "../../lib/theme";

interface BlokCardProps {
  time: string;
  duration: number;
  label: string;
}

export function BlokCard({ time, duration, label }: BlokCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.timeCol}>
        <Text style={styles.time}>{time}</Text>
        <Text style={styles.dur}>{duration} DK</Text>
      </View>
      <View style={styles.labelCol}>
        <Text style={styles.label}>{label.toUpperCase()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: T.slate400,
    // React Native doesn't support dashed borders well cross-platform;
    // bgSunken fill conveys "blocked" state without a gradient.
    backgroundColor: T.bgSunken,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  timeCol: { minWidth: 56 },
  time: {
    fontSize: 14,
    fontFamily: Type.family,
    fontWeight: Type.weight.bold,
    color: T.slate700,
  },
  dur: {
    fontSize: 10,
    fontFamily: Type.family,
    fontWeight: Type.weight.semibold,
    letterSpacing: 1.4,
    color: T.slate500,
    marginTop: 5,
  },
  labelCol: { flex: 1, justifyContent: "center" },
  label: {
    fontSize: 11,
    fontFamily: Type.family,
    fontWeight: Type.weight.bold,
    letterSpacing: 1.98,
    color: T.fg2,
  },
});
```

- [ ] **Step 3: Type-check**

```bash
cd apps/mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/components/ds/AppointmentCard.tsx apps/mobile/components/ds/BlokCard.tsx
git commit -m "p1(mobile): add AppointmentCard and BlokCard ds primitives"
```

---

## Task 5: Mobile StaffRow + OverlineHeader

**Files:**
- Create: `apps/mobile/components/ds/StaffRow.tsx`
- Create: `apps/mobile/components/ds/OverlineHeader.tsx`

- [ ] **Step 1: Create StaffRow**

```tsx
// apps/mobile/components/ds/StaffRow.tsx
import { Pressable, View, Text, StyleSheet } from "react-native";
import { T, R, Type, S } from "../../lib/theme";
import { StatusPill } from "./StatusPill";
import type { Tone } from "./StatusPill"; // if exported

interface StaffRowProps {
  name: string;
  status?: "Aktif" | "Pasif" | string;
  meta?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function StaffRow({ name, status, meta, trailing, onPress }: StaffRowProps) {
  const tone = status === "Aktif" ? "ok" : status ? "bad" : undefined;
  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(name)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        {meta && <Text style={styles.meta}>{meta}</Text>}
      </View>
      {tone && status && <StatusPill tone={tone}>{status}</StatusPill>}
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: T.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: T.divider,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: R.pill,
    backgroundColor: T.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontFamily: Type.family,
    fontWeight: Type.weight.bold,
    letterSpacing: 0.52,
    color: T.ink900,
  },
  info: { flex: 1 },
  name: {
    fontSize: 15,
    fontFamily: Type.family,
    fontWeight: Type.weight.semibold,
    color: T.fg1,
  },
  meta: {
    fontSize: 12,
    fontFamily: Type.family,
    color: T.fg3,
    marginTop: 2,
  },
});
```

**Note:** The `Tone` type needs to be exported from `StatusPill.tsx`. Edit that file to add `export type Tone = "ok" | "warn" | "bad" | "neu";` at the top level.

- [ ] **Step 2: Export Tone from StatusPill**

Edit `apps/mobile/components/ds/StatusPill.tsx` — change:
```tsx
type Tone = "ok" | "warn" | "bad" | "neu";
```
to:
```tsx
export type Tone = "ok" | "warn" | "bad" | "neu";
```

- [ ] **Step 3: Create OverlineHeader**

```tsx
// apps/mobile/components/ds/OverlineHeader.tsx
import { View, Text, StyleSheet } from "react-native";
import { T, Type, S } from "../../lib/theme";

interface OverlineHeaderProps {
  eyebrow: string;
  title: string;
  meta?: string;
  trailing?: React.ReactNode;
  dark?: boolean;
}

export function OverlineHeader({
  eyebrow,
  title,
  meta,
  trailing,
  dark = false,
}: OverlineHeaderProps) {
  const eyebrowColor = dark ? "rgba(245,242,236,0.6)" : T.slate500;
  const titleColor = dark ? T.fgOnInk : T.fg1;
  return (
    <View style={styles.wrapper}>
      <View style={styles.left}>
        <Text style={[styles.eyebrow, { color: eyebrowColor }]}>
          {eyebrow.toUpperCase()}
        </Text>
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
        {meta && <Text style={styles.meta}>{meta}</Text>}
      </View>
      {trailing && <View style={styles.trailing}>{trailing}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: S.s5,
    paddingTop: S.s2,
    paddingBottom: S.s4,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  left: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontSize: 11,
    fontFamily: Type.family,
    fontWeight: Type.weight.semibold,
    letterSpacing: 1.76,
    lineHeight: 11,
  },
  title: {
    fontSize: 32,
    fontFamily: Type.family,
    fontWeight: Type.weight.bold,
    letterSpacing: -0.64,
    lineHeight: 34,
    marginTop: 10,
  },
  meta: {
    fontSize: 13,
    fontFamily: Type.family,
    color: T.fg3,
    marginTop: 8,
  },
  trailing: { flexShrink: 0 },
});
```

- [ ] **Step 4: Type-check**

```bash
cd apps/mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/ds/StaffRow.tsx apps/mobile/components/ds/OverlineHeader.tsx apps/mobile/components/ds/StatusPill.tsx
git commit -m "p1(mobile): add StaffRow, OverlineHeader; export Tone from StatusPill"
```

---

## Task 6: Mobile TabBar + Sheet + DayPicker

**Files:**
- Create: `apps/mobile/components/ds/TabBar.tsx`
- Create: `apps/mobile/components/ds/Sheet.tsx`
- Create: `apps/mobile/components/ds/DayPicker.tsx`

- [ ] **Step 1: Create TabBar**

```tsx
// apps/mobile/components/ds/TabBar.tsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { T, Type } from "../../lib/theme";

export interface TabBarItem {
  key: string;
  label: string;
  /** lucide-react-native icon component */
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}

interface TabBarProps {
  items: TabBarItem[];
  active: string;
  onChange: (key: string) => void;
}

export function TabBar({ items, active, onChange }: TabBarProps) {
  return (
    <View style={styles.bar}>
      {items.map((it) => {
        const isActive = it.key === active;
        const color = isActive ? T.ink900 : T.slate500;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={styles.tab}
          >
            <View style={[styles.indicator, { backgroundColor: isActive ? T.ink900 : "transparent" }]} />
            <it.Icon size={22} color={color} strokeWidth={1.75} />
            <Text style={[styles.label, { color }]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    height: 74,
    borderTopWidth: 1,
    borderTopColor: T.border,
    backgroundColor: "rgba(247,248,250,0.94)",
    paddingBottom: 6,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    position: "relative",
  },
  indicator: {
    position: "absolute",
    top: 0,
    left: "26%",
    right: "26%",
    height: 2,
    borderRadius: 1,
  },
  label: {
    fontSize: 10,
    fontFamily: Type.family,
    fontWeight: Type.weight.semibold,
    letterSpacing: 0.4,
  },
});
```

- [ ] **Step 2: Create Sheet**

```tsx
// apps/mobile/components/ds/Sheet.tsx
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { T, R, Type, S } from "../../lib/theme";

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Sheet({ visible, onClose, title, children, footer }: SheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={() => {}}>
          <View style={styles.handle} />
          {title && (
            <View style={styles.titleRow}>
              <Text style={styles.titleText}>{title}</Text>
              <Pressable onPress={onClose}>
                <Text style={styles.cancelText}>İptal</Text>
              </Pressable>
            </View>
          )}
          <ScrollView contentContainerStyle={styles.body}>
            {children}
          </ScrollView>
          {footer && <View style={styles.footer}>{footer}</View>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,20,16,0.36)",
    justifyContent: "flex-end",
  },
  panel: {
    backgroundColor: T.bgElevated,
    borderTopLeftRadius: R.lg,
    borderTopRightRadius: R.lg,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: "78%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: T.slate200,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: S.s5,
    paddingBottom: 12,
  },
  titleText: {
    fontSize: 20,
    fontFamily: Type.family,
    fontWeight: Type.weight.bold,
    letterSpacing: -0.3,
    color: T.fg1,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: Type.family,
    fontWeight: Type.weight.semibold,
    color: T.slate500,
  },
  body: {
    paddingHorizontal: S.s5,
  },
  footer: {
    paddingHorizontal: S.s5,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: T.divider,
    marginTop: 18,
  },
});
```

- [ ] **Step 3: Create DayPicker**

```tsx
// apps/mobile/components/ds/DayPicker.tsx
import { ScrollView, Pressable, View, Text, StyleSheet } from "react-native";
import { T, R, Type, S } from "../../lib/theme";

const TR_DAYS_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

interface DayPickerProps {
  /** Selected index relative to the rendered day list (0 = first visible day) */
  value: number;
  onChange: (index: number) => void;
  /** Number of days to render (default 7) */
  days?: number;
  /** Start date (default: today) */
  startDate?: Date;
}

export function DayPicker({
  value,
  onChange,
  days = 7,
  startDate,
}: DayPickerProps) {
  const base = startDate ?? new Date();
  const list = Array.from({ length: days }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
    >
      {list.map((d, i) => {
        const isSel = value === i;
        const dayLabel = TR_DAYS_SHORT[(d.getDay() + 6) % 7];
        return (
          <Pressable
            key={i}
            onPress={() => onChange(i)}
            style={[
              styles.cell,
              {
                backgroundColor: isSel ? T.ink900 : T.bgElevated,
                borderColor: isSel ? T.ink900 : T.border,
              },
            ]}
          >
            <Text style={[styles.dayLabel, { color: isSel ? T.fgOnInk : T.fg1, opacity: 0.7 }]}>
              {dayLabel}
            </Text>
            <Text style={[styles.dateNum, { color: isSel ? T.fgOnInk : T.fg1 }]}>
              {d.getDate()}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
  },
  cell: {
    width: 56,
    height: 64,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dayLabel: {
    fontSize: 10,
    fontFamily: Type.family,
    fontWeight: Type.weight.semibold,
    letterSpacing: 1.2,
  },
  dateNum: {
    fontSize: 18,
    fontFamily: Type.family,
    fontWeight: Type.weight.bold,
  },
});
```

- [ ] **Step 4: Type-check**

```bash
cd apps/mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/ds/TabBar.tsx apps/mobile/components/ds/Sheet.tsx apps/mobile/components/ds/DayPicker.tsx
git commit -m "p1(mobile): add TabBar, Sheet, DayPicker ds primitives"
```

---

## Task 7: Mobile barrel index

**Files:**
- Create: `apps/mobile/components/ds/index.ts`

- [ ] **Step 1: Create barrel**

```ts
// apps/mobile/components/ds/index.ts
export { StatusPill } from "./StatusPill";
export type { Tone } from "./StatusPill";
export { SectionLabel } from "./SectionLabel";
export { Button } from "./Button";
export { TextField } from "./TextField";
export { Chip, ChipRow } from "./Chip";
export { Card } from "./Card";
export { KpiCard } from "./KpiCard";
export { AppointmentCard } from "./AppointmentCard";
export { BlokCard } from "./BlokCard";
export { StaffRow } from "./StaffRow";
export { OverlineHeader } from "./OverlineHeader";
export { TabBar } from "./TabBar";
export type { TabBarItem } from "./TabBar";
export { Sheet } from "./Sheet";
export { DayPicker } from "./DayPicker";
```

- [ ] **Step 2: Type-check via barrel**

```bash
cd apps/mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/ds/index.ts
git commit -m "p1(mobile): add ds barrel index — all 14 primitives exported"
```

---

## Task 8: Web ds base primitives — Overline, Card, Button

**Files:**
- Create: `apps/web/src/components/ds/Overline.tsx`
- Create: `apps/web/src/components/ds/Card.tsx`
- Create: `apps/web/src/components/ds/Button.tsx`

- [ ] **Step 1: Create Overline**

```tsx
// apps/web/src/components/ds/Overline.tsx
import { cn } from "@/lib/utils";

interface OverlineProps {
  children: React.ReactNode;
  className?: string;
}

export function Overline({ children, className }: OverlineProps) {
  return (
    <span
      className={cn(
        "text-[11px] font-semibold tracking-[0.16em] uppercase text-[var(--fg-3)]",
        className
      )}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Create Card**

```tsx
// apps/web/src/components/ds/Card.tsx
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[12px]",
        "shadow-[0_1px_3px_rgba(11,18,32,0.06)]",
        onClick && "cursor-pointer hover:border-[var(--border-strong)] transition-colors",
        className
      )}
    >
      {children}
    </Tag>
  );
}
```

- [ ] **Step 3: Create Button**

```tsx
// apps/web/src/components/ds/Button.tsx
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:   "bg-[var(--ink-900)] text-white border-[var(--ink-900)] hover:bg-[var(--ink-800)]",
  accent:    "bg-[var(--brand-600)] text-white border-[var(--brand-700)] hover:bg-[var(--brand-700)]",
  secondary: "bg-transparent text-[var(--ink-900)] border-[var(--ink-900)] hover:bg-[var(--slate-50)]",
  ghost:     "bg-transparent text-[var(--ink-900)] border-transparent hover:bg-[var(--slate-100)]",
  danger:    "bg-transparent text-[var(--coral-600)] border-[var(--coral-600)] hover:bg-[var(--coral-100)]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-[34px] px-3 text-[13px]",
  md: "h-[44px] px-[18px] text-[14px]",
  lg: "h-[52px] px-5 text-[15px]",
};

export function Button({
  variant = "primary",
  size = "md",
  full = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-[12px] border font-semibold transition-all",
        "disabled:opacity-45 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        full && "w-full",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Check if @/lib/utils exists (cn helper)**

```bash
ls apps/web/src/lib/utils.ts 2>/dev/null || echo "missing"
```

If missing, create it:
```ts
// apps/web/src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Then verify packages exist:
```bash
cd apps/web && pnpm list clsx tailwind-merge 2>/dev/null | grep -E "clsx|tailwind-merge"
```

If missing: `cd apps/web && pnpm add clsx tailwind-merge`

- [ ] **Step 5: Type-check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ds/Overline.tsx apps/web/src/components/ds/Card.tsx apps/web/src/components/ds/Button.tsx
git commit -m "p1(web): add Overline, Card, Button ds primitives"
```

---

## Task 9: Web StepHeader + booking-flow components

**Files:**
- Create: `apps/web/src/components/ds/StepHeader.tsx`
- Create: `apps/web/src/components/ds/ProfileCard.tsx`
- Create: `apps/web/src/components/ds/ServiceRow.tsx`
- Create: `apps/web/src/components/ds/StaffPicker.tsx`
- Create: `apps/web/src/components/ds/DateRail.tsx`
- Create: `apps/web/src/components/ds/SlotGrid.tsx`
- Create: `apps/web/src/components/ds/BookButton.tsx`
- Create: `apps/web/src/components/ds/WebField.tsx`
- Create: `apps/web/src/components/ds/NotFoundScreen.tsx`

- [ ] **Step 1: Create StepHeader**

```tsx
// apps/web/src/components/ds/StepHeader.tsx
import { cn } from "@/lib/utils";

type Status = "done" | "active" | "idle";

interface StepHeaderProps {
  num: number;
  title: string;
  status: Status;
}

const circleClasses: Record<Status, string> = {
  done:   "bg-[var(--ink-900)] text-white border-[var(--ink-900)]",
  active: "bg-white text-[var(--ink-900)] border-[var(--ink-900)]",
  idle:   "bg-[var(--bg)] text-[var(--fg-4)] border-[var(--border)]",
};

export function StepHeader({ num, title, status }: StepHeaderProps) {
  return (
    <div className="flex items-center gap-3.5">
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-[1.5px] shrink-0",
          circleClasses[status]
        )}
      >
        {status === "done" ? "✓" : num}
      </div>
      <span
        className={cn(
          "text-[18px] font-semibold tracking-[-0.012em]",
          status === "idle" ? "text-[var(--fg-4)]" : "text-[var(--fg-1)]"
        )}
      >
        {title}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Create ProfileCard**

```tsx
// apps/web/src/components/ds/ProfileCard.tsx
interface ProfileCardProps {
  name: string;
  slug: string;
  bio?: string;
  rating?: string;
  avgService?: string;
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0] ?? "").join("").slice(0, 2).toUpperCase();
}

export function ProfileCard({ name, slug, bio, rating, avgService }: ProfileCardProps) {
  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[18px] p-7 shadow-[var(--shadow-sm)]">
      <span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[var(--fg-3)]">
        Berber · Online Randevu
      </span>
      <div className="flex items-center gap-4 mt-[18px]">
        <div className="w-[60px] h-[60px] rounded-full bg-[var(--brand-600)] text-white flex items-center justify-center font-bold text-[22px] shrink-0">
          {initials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold tracking-[-0.018em]">{name}</h2>
          <div className="text-[13px] text-[var(--fg-3)] mt-1 font-mono">siradaki.app/{slug}</div>
        </div>
      </div>
      {bio && (
        <p className="text-[15px] text-[var(--fg-2)] leading-[1.55] mt-[18px]">{bio}</p>
      )}
      {(avgService || rating) && (
        <div className="flex gap-6 mt-[18px] pt-[18px] border-t border-[var(--divider)]">
          {avgService && (
            <div>
              <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[var(--fg-3)]">Ortalama Süre</div>
              <div className="text-[15px] font-semibold mt-1.5 tabular-nums">{avgService}</div>
            </div>
          )}
          {rating && (
            <div>
              <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[var(--fg-3)]">Puan</div>
              <div className="text-[15px] font-semibold mt-1.5 tabular-nums">{rating}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create ServiceRow**

```tsx
// apps/web/src/components/ds/ServiceRow.tsx
import { cn } from "@/lib/utils";

interface ServiceRowProps {
  name: string;
  duration: number;
  price: number;
  selected?: boolean;
  onClick?: () => void;
}

export function ServiceRow({ name, duration, price, selected = false, onClick }: ServiceRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-4 px-[18px] py-4 rounded-[12px] cursor-pointer transition-all",
        "border-[1.5px]",
        selected
          ? "border-[var(--ink-900)] bg-[var(--ink-900)] text-white"
          : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--fg-1)]"
      )}
    >
      <div>
        <div className="text-base font-semibold">{name}</div>
        <div className={cn("text-[13px] mt-1", selected ? "text-white/65" : "text-[var(--fg-3)]")}>
          {duration} dk
        </div>
      </div>
      <div className="text-[18px] font-bold tabular-nums shrink-0">{price}₺</div>
    </div>
  );
}
```

- [ ] **Step 4: Create StaffPicker**

```tsx
// apps/web/src/components/ds/StaffPicker.tsx
import { cn } from "@/lib/utils";

interface StaffOption {
  id: string;
  name: string;
  role?: string;
}

interface StaffPickerProps {
  staff: StaffOption[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export function StaffPicker({ staff, selected, onSelect }: StaffPickerProps) {
  const optionClass = (id: string) =>
    cn(
      "p-3.5 rounded-[12px] cursor-pointer border-[1.5px] transition-all",
      selected === id
        ? "border-[var(--ink-900)] bg-[var(--ink-900)] text-white"
        : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--fg-1)]"
    );

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2.5">
      <div onClick={() => onSelect("any")} className={optionClass("any")}>
        <div className="text-[15px] font-semibold">Fark Etmez</div>
        <div className={cn("text-[12px] mt-1", selected === "any" ? "text-white/65" : "text-[var(--fg-3)]")}>
          Uygun personele atanır
        </div>
      </div>
      {staff.map((s) => (
        <div key={s.id} onClick={() => onSelect(s.id)} className={cn(optionClass(s.id), "flex items-center gap-3")}>
          <div
            className={cn(
              "w-[34px] h-[34px] rounded-full flex items-center justify-center text-[13px] font-bold shrink-0",
              selected === s.id ? "bg-white/16 text-white" : "bg-[var(--slate-100)] text-[var(--ink-900)]"
            )}
          >
            {s.name[0]}
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold truncate">{s.name}</div>
            {s.role && (
              <div className={cn("text-[11px] mt-0.5", selected === s.id ? "text-white/65" : "text-[var(--fg-3)]")}>
                {s.role}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create DateRail**

```tsx
// apps/web/src/components/ds/DateRail.tsx
import { cn } from "@/lib/utils";

const TR_DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const TR_MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

interface DateRailProps {
  selected: number;
  onSelect: (index: number) => void;
  days?: number;
  startDate?: Date;
}

export function DateRail({ selected, onSelect, days = 14, startDate }: DateRailProps) {
  const base = startDate ?? new Date();
  const list = Array.from({ length: days }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });

  return (
    <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
      {list.map((d, i) => {
        const isSel = selected === i;
        return (
          <div
            key={i}
            onClick={() => onSelect(i)}
            className={cn(
              "flex-[0_0_70px] h-[84px] rounded-[12px] cursor-pointer",
              "flex flex-col items-center justify-center gap-[3px]",
              "border-[1.5px] transition-colors",
              isSel
                ? "border-[var(--ink-900)] bg-[var(--ink-900)] text-white"
                : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--fg-1)]"
            )}
          >
            <div className="text-[10px] font-semibold tracking-[0.14em] uppercase opacity-75">
              {TR_DAYS[(d.getDay() + 6) % 7]}
            </div>
            <div className="text-[22px] font-bold tabular-nums leading-none">{d.getDate()}</div>
            <div className="text-[10px] font-semibold tracking-[0.08em] opacity-75">
              {TR_MONTHS[d.getMonth()]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: Create SlotGrid**

```tsx
// apps/web/src/components/ds/SlotGrid.tsx
import { cn } from "@/lib/utils";

interface Slot {
  time: string;
  full?: boolean;
}

interface SlotGridProps {
  slots: Slot[];
  selected: string | null;
  onSelect: (time: string) => void;
}

export function SlotGrid({ slots, selected, onSelect }: SlotGridProps) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {slots.map((s) => {
        const isSel = s.time === selected;
        return (
          <button
            key={s.time}
            disabled={s.full}
            onClick={() => !s.full && onSelect(s.time)}
            className={cn(
              "h-[42px] rounded-[10px] text-[14px] font-semibold tabular-nums border-[1.5px] transition-all",
              isSel
                ? "border-[var(--ink-900)] bg-[var(--ink-900)] text-white"
                : s.full
                  ? "border-transparent bg-[var(--slate-100)] text-[var(--fg-4)] line-through cursor-not-allowed"
                  : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--fg-1)] hover:border-[var(--ink-900)]"
            )}
          >
            {s.time}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 7: Create BookButton**

```tsx
// apps/web/src/components/ds/BookButton.tsx
interface BookButtonProps {
  time: string | null;
  disabled?: boolean;
  onClick?: () => void;
}

export function BookButton({ time, disabled = false, onClick }: BookButtonProps) {
  return (
    <button
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className="w-full h-14 rounded-[12px] flex items-center justify-center gap-2 text-base font-semibold transition-colors disabled:cursor-not-allowed"
      style={{
        backgroundColor: disabled ? "var(--slate-200)" : "var(--ink-900)",
        color: disabled ? "var(--fg-4)" : "#fff",
      }}
    >
      {time ? `${time}'da Devam Et` : "Saat Seç"}
      {time && <span className="opacity-60">›</span>}
    </button>
  );
}
```

- [ ] **Step 8: Create WebField**

```tsx
// apps/web/src/components/ds/WebField.tsx
interface WebFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}

export function WebField({ label, value, onChange, placeholder, textarea = false }: WebFieldProps) {
  const Tag = textarea ? "textarea" : "input";
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[var(--fg-3)]">
        {label}
      </label>
      <Tag
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={textarea ? 3 : undefined}
        className="font-[inherit] text-[15px] leading-[1.45] text-[var(--fg-1)] bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3.5 py-3 outline-none w-full focus:border-[var(--ink-900)] transition-colors"
        style={{ resize: textarea ? "vertical" : "none" }}
      />
    </div>
  );
}
```

- [ ] **Step 9: Create NotFoundScreen**

```tsx
// apps/web/src/components/ds/NotFoundScreen.tsx
import { Button } from "./Button";

interface NotFoundScreenProps {
  onHome?: () => void;
}

export function NotFoundScreen({ onHome }: NotFoundScreenProps) {
  return (
    <div className="min-h-[480px] flex flex-col items-center justify-center text-center px-16 py-[60px] gap-4">
      <span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[var(--fg-3)]">
        404 · Sayfa Yok
      </span>
      <div className="text-[88px] font-bold tracking-[-0.04em] leading-[0.95] text-[var(--ink-900)]">
        404
      </div>
      <h1 className="text-[28px] font-bold tracking-[-0.02em]">Berber Bulunamadı</h1>
      <p className="text-[15px] text-[var(--fg-2)] max-w-[420px] leading-[1.55]">
        Aradığın berber profili artık mevcut değil ya da bağlantı yanlış yazılmış olabilir.
        Ana sayfaya dönüp tekrar deneyebilirsin.
      </p>
      <Button variant="primary" size="md" className="mt-3" onClick={onHome}>
        Ana Sayfaya Dön
      </Button>
    </div>
  );
}
```

- [ ] **Step 10: Type-check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/components/ds/
git commit -m "p1(web): add StepHeader, ProfileCard, ServiceRow, StaffPicker, DateRail, SlotGrid, BookButton, WebField, NotFoundScreen"
```

---

## Task 10: Web BookingModalShell + barrel index

**Files:**
- Create: `apps/web/src/components/ds/BookingModalShell.tsx`
- Create: `apps/web/src/components/ds/index.ts`

- [ ] **Step 1: Create BookingModalShell**

This is a pure-UI version of the 4-state booking modal. The existing `apps/web/src/components/BookingModal.tsx` (which has Supabase logic) will be refactored in P4 to use this shell internally.

```tsx
// apps/web/src/components/ds/BookingModalShell.tsx
"use client";

import { useState } from "react";
import { WebField } from "./WebField";

export type ModalState = "form" | "loading" | "success" | "error";

interface BookingModalShellProps {
  open: boolean;
  onClose: () => void;
  state: ModalState;
  summary?: string;
  onConfirm?: (data: { name: string; phone: string; note: string }) => void;
}

export function BookingModalShell({
  open,
  onClose,
  state,
  summary,
  onConfirm,
}: BookingModalShellProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-[rgba(11,18,32,0.45)] backdrop-blur-[6px] flex items-center justify-center z-[1000] p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-elevated)] rounded-[18px] w-full max-w-[460px] shadow-[var(--shadow-lg)] border border-[var(--border)] overflow-hidden"
      >
        {state === "form" && (
          <div className="p-7">
            <span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[var(--fg-3)]">
              Onaylama
            </span>
            <h2 className="text-2xl font-bold tracking-[-0.018em] mt-2">Randevuyu Onayla</h2>
            {summary && <div className="text-[13px] text-[var(--fg-3)] mt-1.5">{summary}</div>}
            <div className="flex flex-col gap-3.5 mt-[22px]">
              <WebField label="Ad Soyad" value={name} onChange={setName} placeholder="örn. Ahmet Yılmaz" />
              <WebField label="Telefon" value={phone} onChange={setPhone} placeholder="0(5xx) xxx xx xx" />
              <WebField label="Not (opsiyonel)" value={note} onChange={setNote} placeholder="Saç uzunluğu, tercih, vs." textarea />
            </div>
            <div className="flex gap-2.5 mt-6">
              <button
                onClick={onClose}
                className="flex-1 h-12 rounded-[12px] border-[1.5px] border-[var(--border)] bg-transparent font-semibold text-[14px] text-[var(--fg-2)] cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={() => onConfirm?.({ name, phone, note })}
                disabled={!name || name.length < 2}
                className="flex-[1.5] h-12 rounded-[12px] border-0 font-semibold text-[14px] text-white cursor-pointer disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: !name || name.length < 2 ? "var(--slate-300)" : "var(--ink-900)" }}
              >
                Randevuyu Onayla
              </button>
            </div>
          </div>
        )}

        {state === "loading" && (
          <div className="p-[60px] text-center">
            <div className="w-9 h-9 mx-auto border-[3px] border-[var(--slate-200)] border-t-[var(--brand-600)] rounded-full animate-spin" />
            <div className="mt-[18px] text-[14px] text-[var(--fg-3)]">Randevu oluşturuluyor…</div>
          </div>
        )}

        {state === "success" && (
          <div className="p-7">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[var(--mint-600)] text-white flex items-center justify-center font-bold text-base">
                ✓
              </div>
              <span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[var(--mint-700)]">
                Onaylandı
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-[-0.018em] mt-3.5">Randevunuz alındı</h2>
            {summary && <div className="text-[14px] text-[var(--fg-3)] mt-2">{summary}</div>}
            <div className="bg-[var(--bg-sunken)] rounded-[12px] px-4 py-3.5 mt-[18px] text-[13px] text-[var(--fg-2)]">
              Onay SMS'i yolda.
            </div>
            <button
              onClick={onClose}
              className="mt-[22px] w-full h-12 rounded-[12px] border-0 bg-[var(--ink-900)] text-white font-semibold text-[14px] cursor-pointer"
            >
              Yeni randevu
            </button>
          </div>
        )}

        {state === "error" && (
          <div className="p-7">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[var(--coral-600)] text-white flex items-center justify-center font-bold text-base">
                !
              </div>
              <span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[var(--coral-700)]">
                Hata
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-[-0.018em] mt-3.5">Bu saat az önce doldu.</h2>
            <div className="text-[14px] text-[var(--fg-3)] mt-2">
              Lütfen listeden başka bir saat seçin.
            </div>
            <button
              onClick={onClose}
              className="mt-[22px] w-full h-12 rounded-[12px] border-0 bg-[var(--ink-900)] text-white font-semibold text-[14px] cursor-pointer"
            >
              Saat Seç
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create web barrel index**

```ts
// apps/web/src/components/ds/index.ts
export { Overline } from "./Overline";
export { Card } from "./Card";
export { Button } from "./Button";
export { StepHeader } from "./StepHeader";
export { ProfileCard } from "./ProfileCard";
export { ServiceRow } from "./ServiceRow";
export { StaffPicker } from "./StaffPicker";
export { DateRail } from "./DateRail";
export { SlotGrid } from "./SlotGrid";
export { BookButton } from "./BookButton";
export { WebField } from "./WebField";
export { NotFoundScreen } from "./NotFoundScreen";
export { BookingModalShell } from "./BookingModalShell";
export type { ModalState } from "./BookingModalShell";
```

- [ ] **Step 3: Type-check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -40
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ds/BookingModalShell.tsx apps/web/src/components/ds/index.ts
git commit -m "p1(web): add BookingModalShell + ds barrel index — all web primitives exported"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Task covering it |
|---|---|
| 14 mobile primitives in `components/ds/` | Tasks 1–7 |
| 5+ web primitives in `components/ds/` | Tasks 8–10 |
| Imports only from `lib/theme.ts` + lucide | All mobile tasks — verified |
| No business logic / no Supabase calls | All tasks — verified |
| Barrel exports via `index.ts` | Tasks 7, 10 |
| Token names match `theme.ts` canonical names | All tasks — T.ink900, T.slate*, T.brand*, etc. |
| Banned patterns absent | No gradients, no old colors, no deprecated names |

### Placeholder check
No TBD / TODO in any step.

### Type consistency
- `Tone` exported from `StatusPill.tsx`, re-exported in barrel, used in `StaffRow`
- `TabBarItem` exported from `TabBar.tsx`, re-exported in barrel
- `ModalState` exported from `BookingModalShell.tsx`, re-exported in barrel
- All component props use only types defined within the same task

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-19-p1-primitives.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast parallel iteration

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
