# Plan D — Türkçe Karakter Girişi Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tüm serbest metin `TextInput`'larında Türkçe karakterlerin (ş, ç, ğ, ü, ö, ı) Android klavye tarafından değiştirilmemesini sağla.

**Architecture:** Android'de `autoCorrect={false}` tek başına yetmez — `spellCheck={false}` de gerekir. Bu iki prop birlikte Android IME'nin karakter ikamelerini kapatır. Telefon (`phone-pad`) ve numara (`numeric`) girdileri zaten Türkçe karakter girilemiyor; onlara dokunmaya gerek yok.

**Tech Stack:** React Native (TypeScript)

---

## Arka Plan

Android klavyeler (Gboard, Samsung Keyboard) `autoCorrect={false}` olsa bile spell-check engine aktifken ş→s, ç→c gibi ASCII ikamesi yapabiliyor. `spellCheck={false}` bunu kapatır ve `autoCorrect` ile sinerjik çalışır. iOS'ta bu proplar zaten birbirini ima eder; ek etki beklenmez ama zarar vermez.

Etkilenen serbest metin alanları:
- **settings.tsx ProfileEditorSheet:** Dükkan Adı, Adres, Hakkında (bio) — `autoCorrect={false}` var ama `spellCheck` yok
- **team.tsx AddStaffSheet:** Ad Soyad — hiç `autoCorrect` veya `spellCheck` yok
- **AddAppointmentModal.tsx:** Müşteri Adı — hiç `autoCorrect` veya `spellCheck` yok

Telefon, e-posta ve komisyon alanları (`keyboardType="phone-pad"`, `"email-address"`, `"numeric"`) Türkçe karakter kabul etmez; bu alanlara dokunmuyoruz.

---

## Dosya Haritası

- **Modify:** `apps/mobile/app/(owner)/settings.tsx`
- **Modify:** `apps/mobile/app/(owner)/team.tsx`
- **Modify:** `apps/mobile/components/AddAppointmentModal.tsx`

---

### Task 1: settings.tsx — ProfileEditorSheet Alanları

**Files:**
- Modify: `apps/mobile/app/(owner)/settings.tsx`

Mevcut durum: Dükkan Adı (~satır 243), Adres (~satır 259), Hakkında/bio (~satır 288) alanlarında `autoCorrect={false}` var ama `spellCheck={false}` eksik.

- [ ] **Step 1: Dükkan Adı alanına spellCheck ekle**

Satır ~243 civarındaki TextInput:
```tsx
<TextInput
  value={name}
  onChangeText={setName}
  placeholder="örn. Keskin Berber"
  placeholderTextColor={colors.slate[300]}
  autoCorrect={false}
  spellCheck={false}
  style={styles.textInput}
/>
```

- [ ] **Step 2: Adres alanına spellCheck ekle**

Satır ~259 civarındaki TextInput:
```tsx
<TextInput
  value={address}
  onChangeText={setAddress}
  placeholder="Mahalle, Sokak No, İl"
  placeholderTextColor={colors.slate[300]}
  autoCorrect={false}
  spellCheck={false}
  style={styles.textInput}
/>
```

- [ ] **Step 3: Hakkında (bio) alanına spellCheck ekle**

Satır ~288 civarındaki TextInput:
```tsx
<TextInput
  value={bio}
  onChangeText={setBio}
  placeholder="Dükkanınız hakkında kısa bir açıklama..."
  placeholderTextColor={colors.slate[300]}
  multiline
  numberOfLines={3}
  autoCorrect={false}
  spellCheck={false}
  style={[styles.textInput, styles.textArea]}
/>
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/(owner)/settings.tsx
git commit -m "fix(mobile): settings — add spellCheck=false to free-text inputs for Turkish chars"
```

---

### Task 2: team.tsx — AddStaffSheet Ad Soyad Alanı

**Files:**
- Modify: `apps/mobile/app/(owner)/team.tsx`

Mevcut durum: Satır ~334 civarındaki "Ad Soyad" TextInput'unda ne `autoCorrect` ne `spellCheck` var.

- [ ] **Step 1: Ad Soyad alanına autoCorrect + spellCheck ekle**

Satır ~334 civarındaki TextInput:
```tsx
<TextInput
  value={name}
  onChangeText={setName}
  placeholder="Ad Soyad"
  placeholderTextColor={colors.slate[300]}
  autoCorrect={false}
  spellCheck={false}
  style={styles.textInput}
/>
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(owner)/team.tsx
git commit -m "fix(mobile): team AddStaffSheet — add autoCorrect/spellCheck=false for Turkish chars"
```

---

### Task 3: AddAppointmentModal.tsx — Müşteri Adı Alanı

**Files:**
- Modify: `apps/mobile/components/AddAppointmentModal.tsx`

Mevcut durum: Satır ~214 civarındaki "Müşteri Adı" TextInput'unda ne `autoCorrect` ne `spellCheck` var.

- [ ] **Step 1: Müşteri Adı alanına autoCorrect + spellCheck ekle**

Satır ~214 civarındaki TextInput:
```tsx
<TextInput
  style={styles.textInput}
  value={name}
  onChangeText={setName}
  placeholder="Örn. Ahmet Yılmaz"
  placeholderTextColor={colors.slate[300]}
  autoCorrect={false}
  spellCheck={false}
/>
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/AddAppointmentModal.tsx
git commit -m "fix(mobile): AddAppointmentModal — add autoCorrect/spellCheck=false for Turkish chars"
```

---

### Task 4: Push + Doğrulama

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Cihazda test**

`test-berber@berber.dev` ile giriş yap:
- [ ] Ayarlar → Dükkan Bilgileri → Dükkan Adı: "Şahin Berber" yaz → ş→s dönüşümü OLMAMALI
- [ ] Ayarlar → Dükkan Bilgileri → Adres: "Çarşı Mah." yaz → ç→c dönüşümü OLMAMALI
- [ ] Ayarlar → Dükkan Bilgileri → Hakkında: "Güven ve kalite." yaz → ğ, ü bozulmamalı
- [ ] Ekip → Personel Ekle → Ad Soyad: "Ömer Güneş" yaz → ö, ü, ş bozulmamalı
- [ ] Ajanda → Randevu Ekle → Müşteri Adı: "İbrahim Çelik" yaz → İ, ç bozulmamalı
