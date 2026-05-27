# Mobile UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Komponent-önce, ekran-sonra kapsamlı mobile UI yenileme — safe area, spacing tutarlılığı, dark mode temizliği, login klavye fix, sade güzellik.

**Architecture:** DS komponentleri önce güncellenir (OverlineHeader safe area alır, Button google variant kazanır, Sheet radius.xl olur, TextField focus state alır, SectionLabel renk düzeltilir), ardından auth ekranları, owner ekranları, barber ekranları sırasıyla uygulanır. Her task bir commit.

**Tech Stack:** React Native 0.76, Expo Router v4, TypeScript, `react-native-safe-area-context` (zaten kurulu — Expo ile birlikte gelir), pnpm monorepo.

---

## TypeScript Gate

Her task sonunda çalıştır:
```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v "\.expo/types/router\.d\.ts" | grep -v "^$"
```
Beklenen: çıktı yok (0 hata).

---

## Task 1: OverlineHeader — safe area + dark mode kaldır

**Files:**
- Modify: `apps/mobile/components/ds/OverlineHeader.tsx`

`dark` prop'u ve tüm dark variant stillerini kaldır. `useSafeAreaInsets()` ile paddingTop'u dinamik yap.

- [ ] **Step 1: OverlineHeader.tsx'i tamamen yeniden yaz**

```typescript
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';

interface OverlineHeaderProps {
  eyebrow: string;
  title: string;
  meta?: string;
  trailing?: React.ReactNode;
}

export function OverlineHeader({
  eyebrow,
  title,
  meta,
  trailing = null,
}: OverlineHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.left}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        {meta != null && <Text style={styles.meta}>{meta}</Text>}
      </View>
      {trailing != null && <View style={styles.trailing}>{trailing}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: { minWidth: 0, flex: 1 },
  trailing: { flexShrink: 0 },
  eyebrow: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 11,
    letterSpacing: 1.76,
    textTransform: 'uppercase',
    lineHeight: 11,
    color: colors.slate[500],
  },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 32,
    letterSpacing: -0.64,
    lineHeight: 33.6,
    marginTop: 10,
    color: colors.ink[900],
  },
  meta: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 13,
    marginTop: 8,
    color: colors.slate[500],
  },
});
```

- [ ] **Step 2: TypeScript gate çalıştır**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v "\.expo/types/router\.d\.ts" | grep -v "^$"
```
Beklenen: `dark` prop kullanan ekranlarda TypeScript hataları. (Bu beklenen RED — bir sonraki task'ta düzeltilecek.)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/ds/OverlineHeader.tsx
git commit -m "feat(ui): OverlineHeader — safe area, remove dark mode"
```

---

## Task 2: OverlineHeader dark prop — çağrı taraması + TypeScript teyit

**Files:** (değişiklik yok — teyit task'ı)

Mevcut ekranların hiçbiri OverlineHeader'a `dark` prop geçmiyor. Bu task TypeScript gate ile bunu doğrular ve Task 1'in temiz derlendiğini onaylar.

- [ ] **Step 1: Hiç dark prop kullanımı olmadığını doğrula**

```bash
grep -rn "OverlineHeader" apps/mobile/app --include="*.tsx" | grep "dark"
```
Beklenen: çıktı yok (0 kullanım).

- [ ] **Step 2: TypeScript gate — Task 1 sonrası sıfır hata**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v "\.expo/types/router\.d\.ts" | grep -v "^$"
```
Beklenen: çıktı yok.

- [ ] **Step 3: Temizse devam et (commit gerekmez — dosya değişmedi)**

---

## Task 3: SectionLabel — renk slate[400]

**Files:**
- Modify: `apps/mobile/components/ds/SectionLabel.tsx`

- [ ] **Step 1: SectionLabel.tsx'te rengi güncelle**

`color: colors.slate[500]` satırını bul, `colors.slate[400]` yap:

```typescript
const styles = StyleSheet.create({
  label: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 11,
    letterSpacing: 1.76,
    textTransform: 'uppercase',
    color: colors.slate[400],   // değişti: 500 → 400
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
    lineHeight: 11,
  },
});
```

- [ ] **Step 2: TypeScript gate**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v "\.expo/types/router\.d\.ts" | grep -v "^$"
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/ds/SectionLabel.tsx
git commit -m "feat(ui): SectionLabel color slate[400] — de-emphasize section labels"
```

---

## Task 4: TextField — focus state + error state

**Files:**
- Modify: `apps/mobile/components/ds/TextField.tsx`

- [ ] **Step 1: TextField.tsx'i yeniden yaz**

Focus state için `useState` ve `onFocus`/`onBlur` eklenir. Error state için `error` prop eklenir.

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  KeyboardTypeOptions,
} from 'react-native';
import { colors, radius } from '../../lib/theme';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
  error?: string | null;
  style?: ViewStyle;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  editable = true,
  error,
  style,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.slate[300]}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!error && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontSize: 11,
    fontFamily: 'Montserrat-SemiBold',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: colors.slate[500],
    lineHeight: 11,
  },
  input: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 15,
    lineHeight: 21,
    color: colors.ink[900],
    backgroundColor: colors.slate[0],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputFocused: {
    borderColor: colors.brand[600],
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: colors.coral[600],
  },
  inputDisabled: {
    backgroundColor: colors.slate[100],
    color: colors.slate[400],
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Montserrat-Regular',
    color: colors.coral[600],
    marginTop: -2,
  },
});
```

- [ ] **Step 2: TypeScript gate**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v "\.expo/types/router\.d\.ts" | grep -v "^$"
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/ds/TextField.tsx
git commit -m "feat(ui): TextField focus state + error prop"
```

---

## Task 5: Button — google variant ekle

**Files:**
- Modify: `apps/mobile/components/ds/Button.tsx`

- [ ] **Step 1: Button.tsx'te Variant tipine `google` ekle ve stilleri tanımla**

`type Variant` satırını bul:
```typescript
// ÖNCE:
type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';

// SONRA:
type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger' | 'google';
```

`StyleSheet.create` içine şu stilleri ekle (`variant_danger` ve `labelColor_danger`'dan sonra):
```typescript
  variant_google: {
    backgroundColor: colors.slate[0],
    borderColor: colors.slate[200],
  },
  labelColor_google: { color: colors.ink[900] },
```

- [ ] **Step 2: TypeScript gate**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v "\.expo/types/router\.d\.ts" | grep -v "^$"
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/ds/Button.tsx
git commit -m "feat(ui): Button google variant"
```

---

## Task 6: Sheet — radius.xl + paddingTop 20

**Files:**
- Modify: `apps/mobile/components/ds/Sheet.tsx`

- [ ] **Step 1: Sheet.tsx'te iki satırı güncelle**

`borderTopLeftRadius` ve `borderTopRightRadius` satırlarını bul:
```typescript
// ÖNCE:
borderTopLeftRadius: radius.lg,
borderTopRightRadius: radius.lg,
paddingTop: 12,

// SONRA:
borderTopLeftRadius: radius.xl,
borderTopRightRadius: radius.xl,
paddingTop: 20,
```

- [ ] **Step 2: TypeScript gate**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v "\.expo/types/router\.d\.ts" | grep -v "^$"
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/ds/Sheet.tsx
git commit -m "feat(ui): Sheet radius.xl (24px) + paddingTop 20"
```

---

## Task 7: Login — CTA sırası düzelt + SafeAreaView

**Files:**
- Modify: `apps/mobile/app/(auth)/login.tsx`

**Sorun:** Google butonu CTA'nın üstünde, Giriş Yap altında. Klavye açılınca Giriş Yap ekran dışına kayar.

- [ ] **Step 1: Login.tsx'te 3 değişiklik yap**

**Değişiklik A — SafeAreaView ile sar:**

Import'a ekle:
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';
```

`KeyboardAvoidingView`'un `style={styles.kav}` olan kısmını bul. Dış sarmalayıcı olarak `SafeAreaView` ekle:
```tsx
// ÖNCE:
return (
  <KeyboardAvoidingView style={styles.kav} ...>
    <ScrollView ...>
      <View style={styles.topArea}>    {/* marginTop: 60 */}

// SONRA:
return (
  <SafeAreaView style={styles.kav}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView ...>
        <View style={styles.topArea}>    {/* marginTop değişiyor — aşağıya bak */}
```

**Değişiklik B — topArea marginTop'u azalt:**

`topArea` stilini bul:
```typescript
// ÖNCE:
topArea: { marginTop: 60 },

// SONRA:
topArea: { marginTop: 40 },
```

**Değişiklik C — CTA sırasını ters çevir ve Google butonuna google variant ver:**

CTA `<View style={styles.cta}>` bloğunu bul. İçeriği şu sıraya getir:
```tsx
<View style={styles.cta}>
  {error ? <Text style={styles.errorText}>{error}</Text> : null}

  {/* 1. Önce email/şifre butonu */}
  <Button
    variant="primary"
    size="lg"
    full
    disabled={!canSubmit || loading}
    onPress={handleLogin}
  >
    {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
  </Button>

  {/* 2. Divider */}
  <View style={styles.divider}>
    <View style={styles.dividerLine} />
    <Text style={styles.dividerText}>veya</Text>
    <View style={styles.dividerLine} />
  </View>

  {/* 3. Google butonu — variant="google", her iki loading durumunda disabled */}
  <Button
    variant="google"
    size="lg"
    full
    disabled={loading}
    onPress={handleGoogleLogin}
  >
    Google ile Giriş Yap
  </Button>

  <View style={styles.footerRow}>
    <Text style={styles.footerText}>Hesabın yok mu? </Text>
    <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
      <Text style={styles.footerLink}>Kayıt ol</Text>
    </TouchableOpacity>
  </View>
</View>
```

- [ ] **Step 2: kav stilini güncelle (SafeAreaView flex:1 aldığı için)**

```typescript
// kav stilinden backgroundColor kaldırma, SafeAreaView yönetir artık:
kav: {
  flex: 1,
  backgroundColor: colors.slate[0],
},
```

- [ ] **Step 3: TypeScript gate**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v "\.expo/types/router\.d\.ts" | grep -v "^$"
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(auth\)/login.tsx
git commit -m "fix(ui): login CTA order — Giriş Yap above Google, SafeAreaView"
```

---

## Task 8: Register — SafeAreaView + marginTop

**Files:**
- Modify: `apps/mobile/app/(auth)/register.tsx`

- [ ] **Step 1: Register.tsx'te SafeAreaView ekle**

Import'a ekle:
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';
```

Dış container'ı bul (`KeyboardAvoidingView` veya `ScrollView`'un dışında ne varsa). Login ile aynı pattern:
```tsx
// ÖNCE (ne olursa olsun dış sarmalayıcı):
return (
  <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.slate[0] }} ...>

// SONRA:
return (
  <SafeAreaView style={{ flex: 1, backgroundColor: colors.slate[0] }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
```

Kapanış taglarını da güncelle — `</KeyboardAvoidingView>` sonrasına `</SafeAreaView>` ekle.

- [ ] **Step 2: marginTop'u güncelle**

Top area'daki `marginTop: 8` olan stilini bul, `marginTop: 40` yap.

- [ ] **Step 3: TypeScript gate**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v "\.expo/types/router\.d\.ts" | grep -v "^$"
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(auth\)/register.tsx
git commit -m "feat(ui): register SafeAreaView + marginTop 40"
```

---

## Task 9: Pending + Google Onboarding — SafeAreaView

**Files:**
- Modify: `apps/mobile/app/(auth)/pending.tsx`
- Modify: `apps/mobile/app/(auth)/google-onboarding.tsx`

- [ ] **Step 1: pending.tsx — SafeAreaView ekle**

Import'a `SafeAreaView` from `react-native-safe-area-context` ekle. En dış `<View style={{ flex: 1 ... }}>` veya root container'ı `SafeAreaView` ile değiştir:
```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

// Root view'ı SafeAreaView yap:
return (
  <SafeAreaView style={{ flex: 1, backgroundColor: colors.slate[0] }}>
    {/* mevcut içerik değişmeden kalır */}
  </SafeAreaView>
);
```

- [ ] **Step 2: google-onboarding.tsx — SafeAreaView ekle**

Aynı pattern. `KeyboardAvoidingView`'un dışına `SafeAreaView` sar:
```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

// ÖNCE:
return (
  <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.slate[0] }} ...>

// SONRA:
return (
  <SafeAreaView style={{ flex: 1, backgroundColor: colors.slate[0] }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
```

Kapanış taglarını güncelle.

- [ ] **Step 3: TypeScript gate**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v "\.expo/types/router\.d\.ts" | grep -v "^$"
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(auth\)/pending.tsx apps/mobile/app/\(auth\)/google-onboarding.tsx
git commit -m "feat(ui): pending + google-onboarding SafeAreaView"
```

---

## Task 10: Owner/Index — dark mode temizle + spacing

**Files:**
- Modify: `apps/mobile/app/(owner)/index.tsx`

`KpiPolished` ve yardımcı bileşenler (`Sparkline`, `RingProgress`) bu dosyada inline tanımlı.

- [ ] **Step 1: RingProgress'ten dark prop'u kaldır**

`function RingProgress` tanımını bul. `dark` parametresini kaldır, sabit light mode değerleri yaz:
```typescript
// ÖNCE:
function RingProgress({ value, max, dark }: { value: number; max: number; dark: boolean }) {
  const pct   = value / max;
  const ringFg = dark ? '#ffffff' : colors.brand[600];
  const ringBg = dark ? 'rgba(255,255,255,0.12)' : colors.slate[100];

// SONRA:
function RingProgress({ value, max }: { value: number; max: number }) {
  const pct    = value / max;
  const ringFg = colors.brand[600];
  const ringBg = colors.slate[100];
```

- [ ] **Step 2: Sparkline'dan dark prop'u kaldır**

`function Sparkline` tanımını bul:
```typescript
// ÖNCE:
function Sparkline({ data, dark }: { data: number[]; dark: boolean }) {
  ...
  const barColor = dark ? 'rgba(255,255,255,0.55)' : colors.brand[500];

// SONRA:
function Sparkline({ data }: { data: number[] }) {
  ...
  const barColor = colors.brand[500];
```

- [ ] **Step 3: KpiPolished'ten dark prop'u kaldır**

`function KpiPolished` ve `KpiPolishedProps` interface'ini bul:

```typescript
// ÖNCE — interface'den dark varsa kaldır, zaten yok
// KpiPolished fonksiyon gövdesindeki dark local variable'ı kaldır:

function KpiPolished({ label, value, unit, accent = false, spark, progress, max }: KpiPolishedProps) {
  const dark   = accent;           // ← BU SATIRI KALDIR
  const bg     = dark ? colors.ink[900] : colors.slate[0];         // ← değiştir
  const fg     = dark ? '#ffffff'  : colors.ink[900];              // ← değiştir
  const sub    = dark ? 'rgba(255,255,255,0.5)' : colors.slate[500]; // ← değiştir
  const borCol = dark ? colors.ink[700] : colors.slate[200];       // ← değiştir

// SONRA:
function KpiPolished({ label, value, unit, accent = false, spark, progress, max }: KpiPolishedProps) {
  const bg     = accent ? colors.ink[900] : colors.slate[0];
  const fg     = accent ? '#ffffff'       : colors.ink[900];
  const sub    = accent ? 'rgba(255,255,255,0.5)' : colors.slate[500];
  const borCol = accent ? colors.ink[700] : colors.slate[200];
```

- [ ] **Step 4: KpiPolished içindeki Sparkline ve RingProgress çağrılarını güncelle**

`dark={dark}` geçilen yerleri bul ve kaldır:
```tsx
// ÖNCE:
{spark && <Sparkline data={spark} dark={dark} />}
{progress !== undefined ? <RingProgress value={progress} max={max ?? 1} dark={dark} /> : null}

// SONRA:
{spark && <Sparkline data={spark} />}
{progress !== undefined ? <RingProgress value={progress} max={max ?? 1} /> : null}
```

- [ ] **Step 5: kpi.card shadow'unu sabitle**

`kpi` StyleSheet içinde `card` stilini bul. Sabit light mode shadow ile değiştir:
```typescript
card: {
  flex: 1,
  minWidth: 0,
  borderWidth: 1,
  borderRadius: 14,
  paddingTop: 13,
  paddingHorizontal: 13,
  paddingBottom: 11,
  ...shadows.sm,   // sabit — dark/light ayrımı yok
},
```
`shadows` import'una bak — zaten `../../lib/theme`'den geliyor, `shadows` ekle gerekiyorsa: `import { colors, shadows } from '../../lib/theme';`

- [ ] **Step 6: ScrollView paddingTop'u kontrol et**

`styles.content` içinde `paddingTop` varsa kaldır — OverlineHeader artık kendi safe area padding'ini manage ediyor:
```typescript
content: {
  // paddingTop: X  ← KALDIR (varsa)
  paddingBottom: 40,
},
```

- [ ] **Step 7: TypeScript gate**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v "\.expo/types/router\.d\.ts" | grep -v "^$"
```

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/app/\(owner\)/index.tsx
git commit -m "feat(ui): owner/index — remove dark mode from KPI cards, fix shadows"
```

---

## Task 11: Owner/Earnings — local Chip → DS Chip

**Files:**
- Modify: `apps/mobile/app/(owner)/earnings.tsx`

- [ ] **Step 1: Local Chip tanımını kaldır**

Dosyada `function Chip` ve `interface ChipProps` tanımlarını (yerel) bul ve **sil**. Bu blok şuna benziyor:
```typescript
// SİL — bu bloğun tamamını kaldır:
interface ChipProps {
  selected: boolean;
  onPress: () => void;
  children: string;
}

function Chip({ selected, onPress, children }: ChipProps) {
  return (
    <TouchableOpacity ...>
      <Text ...>{children}</Text>
    </TouchableOpacity>
  );
}
```

- [ ] **Step 2: DS Chip ve ChipRow import et**

Mevcut import'lara ekle:
```typescript
import { Chip, ChipRow } from '../../components/ds/Chip';
```

Artık kullanılmayan `TouchableOpacity`'yi import listesinden kaldır (eğer sadece Chip için kullanılıyorsa).

- [ ] **Step 3: Period seçiciyi ChipRow ile sar**

Period chip'lerinin render edildiği yeri bul. Genellikle üç `<Chip>` yan yana sıralı. Bunları `<ChipRow padded={false}>` ile sar:
```tsx
{/* ÖNCE: */}
<View style={styles.periodRow}>
  <Chip selected={period === 'day'}  onPress={() => setPeriod('day')}>Bugün</Chip>
  <Chip selected={period === '7'}    onPress={() => setPeriod('7')}>7 gün</Chip>
  <Chip selected={period === '30'}   onPress={() => setPeriod('30')}>30 gün</Chip>
</View>

{/* SONRA: */}
<ChipRow padded style={{ marginBottom: 16 }}>
  <Chip selected={period === 'day'}  onPress={() => setPeriod('day')}>Bugün</Chip>
  <Chip selected={period === '7'}    onPress={() => setPeriod('7')}>7 gün</Chip>
  <Chip selected={period === '30'}   onPress={() => setPeriod('30')}>30 gün</Chip>
</ChipRow>
```

`styles.periodRow` varsa kaldır (artık ChipRow yönetiyor).

- [ ] **Step 4: OverlineHeader dark prop kaldırıldığını teyit et**

Bu Task 2'de yapılmış olmalı. Eğer earnings.tsx'te `<OverlineHeader ... dark` görüyorsan kaldır.

- [ ] **Step 5: TypeScript gate**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v "\.expo/types/router\.d\.ts" | grep -v "^$"
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/\(owner\)/earnings.tsx
git commit -m "feat(ui): earnings — replace local Chip with DS Chip + ChipRow"
```

---

## Task 12: Owner/Agenda — spacing + FAB standardize

**Files:**
- Modify: `apps/mobile/app/(owner)/agenda.tsx`

- [ ] **Step 1: ScrollView content padding'ini kontrol et**

`contentContainerStyle` içinde `paddingTop` varsa kaldır (OverlineHeader yönetiyor):
```typescript
// paddingTop: X  ← KALDIR (varsa)
paddingBottom: 100,  // FAB için — koru
paddingHorizontal: 16,
```

- [ ] **Step 2: FAB stilini standardize et**

FAB Button'un `style` prop'unu bul. `bottom: 90, right: 20` ve `shadow` içeriyor:
```tsx
style={{
  position: 'absolute',
  bottom: 90,
  right: 20,
  shadowColor: colors.brand[700],
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.5,
  shadowRadius: 20,
  elevation: 8,
}}
```
Bu değerleri koru — zaten doğru.

- [ ] **Step 3: TypeScript gate**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v "\.expo/types/router\.d\.ts" | grep -v "^$"
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(owner\)/agenda.tsx
git commit -m "feat(ui): agenda — remove paddingTop, spacing cleanup"
```

---

## Task 13: Owner/Team — invite link box + kart anatomisi

**Files:**
- Modify: `apps/mobile/app/(owner)/team.tsx`

- [ ] **Step 1: Invite link kutusunu standardize et**

Dosyada invite link'in gösterildiği `View`'u bul (genellikle monospace text içeren). Stilini şöyle güncelle:
```tsx
// Invite link container:
<View style={styles.inviteBox}>
  <Text style={styles.inviteText}>{inviteLink}</Text>
</View>

// Stiller:
inviteBox: {
  backgroundColor: colors.slate[100],
  borderRadius: radius.sm,
  padding: 12,
  marginTop: 8,
},
inviteText: {
  fontFamily: 'SpaceMono',   // monospace — theme.ts'te typography.fontFamily.mono = 'SpaceMono'
  fontSize: 12,
  color: colors.ink[900],
},
```

- [ ] **Step 2: Staff row kart padding'ini 14px yap**

`staffRow` veya `memberCard` style'ını bul, `padding` değerini 14'e getir:
```typescript
staffRow: {
  ...
  padding: 14,         // standart kart padding
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.slate[200],
  backgroundColor: colors.slate[0],
},
```

- [ ] **Step 3: TypeScript gate**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v "\.expo/types/router\.d\.ts" | grep -v "^$"
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(owner\)/team.tsx
git commit -m "feat(ui): team — invite link box, staff row padding 14px"
```

---

## Task 14: Owner/Settings — section kartları + toggle row

**Files:**
- Modify: `apps/mobile/app/(owner)/settings.tsx`

- [ ] **Step 1: Section kart padding'lerini 14px yap**

Dosyada `operasyonCard`, `accountCard`, `widgetCard` veya benzer isimli kartları bul. `padding` değerlerini 14'e standartlaştır:
```typescript
card: {
  backgroundColor: colors.slate[0],
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.slate[200],
  padding: 14,
},
```

- [ ] **Step 2: Toggle row divider'ları düzenle**

Toggle satırlarının arasında `borderBottom` divider koy, son satırda kaldır:
```typescript
toggleRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: colors.slate[100],
},
toggleRowLast: {
  borderBottomWidth: 0,   // son row'da border yok
},
```

Son toggle row'a `style={[styles.toggleRow, styles.toggleRowLast]}` ekle.

- [ ] **Step 3: TypeScript gate**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v "\.expo/types/router\.d\.ts" | grep -v "^$"
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(owner\)/settings.tsx
git commit -m "feat(ui): settings — card padding 14px, toggle row dividers"
```

---

## Task 15: Owner/Services — kart padding + ServiceSheet

**Files:**
- Modify: `apps/mobile/app/(owner)/services.tsx`

- [ ] **Step 1: Service row kart padding'ini 14px yap**

Service satırlarının container stilini bul:
```typescript
serviceRow: {
  ...
  padding: 14,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.slate[200],
  backgroundColor: colors.slate[0],
},
```

- [ ] **Step 2: Inactive row opacity'sini koru**

`opacity: 0.55` — değişmez, koru.

- [ ] **Step 3: TypeScript gate**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v "\.expo/types/router\.d\.ts" | grep -v "^$"
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(owner\)/services.tsx
git commit -m "feat(ui): services — row padding 14px canonical"
```

---

## Task 16: App/Index (Barber) — section label spacing + gap

**Files:**
- Modify: `apps/mobile/app/(app)/index.tsx`

- [ ] **Step 1: AppointmentCard gap'ini 10px yap**

Liste içindeki `gap` veya `marginBottom` değerlerini bul. Kart'lar arası boşluk 10px olmalı:
```typescript
list: {
  gap: 10,
  paddingHorizontal: 20,
  paddingBottom: 100,
},
```

- [ ] **Step 2: SectionLabel margin override'larını kontrol et**

Bu ekranda SectionLabel `style` prop ile `marginTop: 12, marginBottom: 4` alıyor. Bu doğru (component default 24/10, burası daha kompakt liste görünümü için override ediyor). Değiştirme.

- [ ] **Step 3: FAB konumunu kontrol et**

`bottom: 90, right: 20` olmalı. Farklıysa düzelt.

- [ ] **Step 4: TypeScript gate**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v "\.expo/types/router\.d\.ts" | grep -v "^$"
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/\(app\)/index.tsx
git commit -m "feat(ui): barber/index — card gap 10px, FAB position"
```

---

## Task 17: App/Settings + App/Block — SafeAreaView + spacing

**Files:**
- Modify: `apps/mobile/app/(app)/settings.tsx`
- Modify: `apps/mobile/app/(app)/block.tsx`

- [ ] **Step 1: app/settings.tsx — SafeAreaView**

Login/register ile aynı pattern:
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';
```
En dış view'ı `SafeAreaView` yap.

- [ ] **Step 2: app/block.tsx — OverlineHeader zaten var, paddingTop kontrol**

`contentContainerStyle` içinde `paddingTop` varsa kaldır. Duration grid ve reason list `paddingHorizontal: 20` korunur.

- [ ] **Step 3: TypeScript gate**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v "\.expo/types/router\.d\.ts" | grep -v "^$"
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(app\)/settings.tsx apps/mobile/app/\(app\)/block.tsx
git commit -m "feat(ui): app/settings SafeAreaView, block paddingTop cleanup"
```

---

## Task 18: AddAppointmentModal — Sheet güncellemesi teyit + spacing

**Files:**
- Modify: `apps/mobile/components/AddAppointmentModal.tsx`

Sheet komponent Task 6'da zaten güncellendi (radius.xl). Bu task AddAppointmentModal'ın Sheet'i doğru kullandığını ve iç spacing'in tutarlı olduğunu doğrular.

- [ ] **Step 1: AddAppointmentModal'ın Sheet import ettiğini doğrula**

```bash
grep "Sheet" apps/mobile/components/AddAppointmentModal.tsx | head -5
```
`Sheet` import görünüyorsa Task 6 değişiklikleri otomatik uygulandı.

- [ ] **Step 2: İç Chip kullanımını DS Chip ile karşılaştır**

```bash
grep "Chip" apps/mobile/components/AddAppointmentModal.tsx
```
Local Chip tanımı varsa DS Chip ile değiştir (Task 11 ile aynı pattern).

- [ ] **Step 3: Section spacing'i kontrol et**

Modal içindeki `SectionLabel` kullanımlarını bul. `style` prop ile farklı marginTop veriliyorsa — modal içi için `marginTop: 16` makul, değişme.

- [ ] **Step 4: TypeScript gate — son kez tüm proje**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v "\.expo/types/router\.d\.ts" | grep -v "^$"
```
Beklenen: çıktı yok.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/AddAppointmentModal.tsx
git commit -m "feat(ui): AddAppointmentModal — DS Chip verify, Sheet radius.xl via component"
```

---

## Son Kontrol

- [ ] Tüm commitler `feat/ui-ux` branch'inde
- [ ] `git log --oneline -20` ile task sırası doğru görünüyor
- [ ] `npx expo start` ile uygulamayı başlat, sırayla kontrol et:
  - Login: klavye açılınca Giriş Yap görünüyor, Google görünmüyor ✓
  - Owner/Index: "Dükkan Özet" status bar'a çarpmıyor ✓
  - Owner/Earnings: Chip'ler DS Chip görünümünde ✓
  - Sheet'ler (team/settings/services): üst köşeler daha yuvarlak (24px) ✓
  - TextField'lar: focus'ta brand[600] kenarlık ✓
