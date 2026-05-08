# Berber Randevu — Tasarım Dili

**Referans dosyalar (birebir):** `Berber Randevu.html`, `app.jsx`, `ios-frame.jsx`
**Hedef:** mobil + web aynı dili konuşur. Sayfa başına ayrı tasarım yaptırırken bu dosyayı brief'e ekle.

---

## 1. Marka & Ton

- **Karakter:** profesyonel, sakin, ince mizah yok. Berber dükkan paneli — operasyonel araç.
- **Dil:** Türkçe, kısa cümle. CTA fiili açık ("Randevuyu Kaydet", "İptal Et", "Tamamlandı"). Pasif sesten kaç.
- **Eyebrow rozet:** kırmızı UPPERCASE, harf aralığı 1.4, font-weight 600, font-size 11. Örn: `BERBER · DÜKKAN PANELİ`.
- **Başlık:** "Randevular" gibi tek kelime, 30/700, letter-spacing -0.5, koyu ink.
- **Tarihler:** "7 Mayıs 2026, Çar" formatı; gün adı kısa (Paz/Pzt/Sal/Çar/Per/Cum/Cmt).

---

## 2. Renk paleti

**Toprak tonları yasak.** Krem / kahve / rust / taş gri kullanma.

| Token       | Hex       | Kullanım                                     |
|-------------|-----------|----------------------------------------------|
| `bg`        | `#F8FAFC` | Sayfa zemini (soğuk gri-beyaz)               |
| `surface`   | `#FFFFFF` | Kart, sheet, modal zemini                    |
| `surfaceAlt`| `#F1F5F9` | İkincil yüzey (block kart, ikon zemini)      |
| `ink`       | `#111827` | Birincil metin, ikon                         |
| `muted`     | `#6B7280` | İkincil metin, label                         |
| `mutedAlt`  | `#9CA3AF` | Üstü çizili / disabled metin                 |
| `hair`      | `#E5E7EB` | Border, ayraç                                |
| `hairAlt`   | `#CBD5E1` | Dashed border, vurgulu ayraç                 |
| `past`      | `#D1D5DB` | Geçmiş timeline track + nokta                |
| `red`       | `#DC2626` | NOW indicator, today rozeti, danger          |
| `redSoft`   | `#FEF2F2` | Danger button bg (border `#FECACA`)          |
| `blue`      | `#2563EB` | Servis satırı, ikincil aksiyon               |
| `blueSoft`  | `#EFF6FF` | Aktif chip / aksiyon kartı zemini            |
| `navy`      | `#1E3A8A` | **Birincil CTA**, FAB, avatar gradient sonu  |
| `avatarGr`  | `#DBEAFE → #EFF6FF` | Avatar 135° linear gradient        |

**Berber direği (animated track):** `repeating-linear-gradient(135deg, #DC2626 0 6px, #FFFFFF 6px 12px, #2563EB 12px 18px, #FFFFFF 18px 24px)`; 6s linear infinite, opacity 0.45–0.55.

**Pulse (NOW dot):** `#DC2626`, 14×14, box-shadow halka 0→12px 1.6s ease-out infinite.

---

## 3. Tipografi

- **Font:** `-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif`. Tabular numerals saatler için (`fontVariantNumeric: tabular-nums`).
- **Ölçek:**
  - H1 30/700, letter-spacing -0.5
  - H2 (sheet başlık) 20/700
  - Detail başlık 24/700
  - Body 14/600 (kart başlık) · 14/500 (gövde)
  - Meta 12/500–600
  - Eyebrow / micro-label 11/600 UPPERCASE letter-spacing 1.2–1.4
  - Time 12/700 (geçmiş 500, gelecek 600), tabular-nums
  - Day-strip gün adı 10/600 UPPERCASE letter-spacing 0.5; tarih 20/700

---

## 4. Spacing & Boyut

- **Grid:** sayfa padding 20, kart padding 12–14, sheet padding 20.
- **Radii:** 10 (input/chip), 12 (kart, block, action button), 14 (date pill, primary CTA), 16 (FAB), 24 (bottom sheet üst köşe), 9999 (glass pill).
- **Timeline kolon genişliği:** `52px (saat) + 28px (track) + 1fr (kart)`. Track içi nokta y ekseni 16px üstten.
- **Day-strip pill:** 48×64, gap 8.
- **FAB:** alt 24, sol/sağ 16, padding 16, full width.
- **Bottom sheet:** üst-köşe 24, max-height 78%, grabber 40×4 / `#E5E7EB`.

---

## 5. Gölge & Yükseklik

| Yer                   | Shadow                                                                 |
|-----------------------|------------------------------------------------------------------------|
| Upcoming card         | `0 1px 2px rgba(17,24,39,.04), 0 4px 8px rgba(17,24,39,.04)`           |
| Date pill (selected)  | `0 6px 14px rgba(17,24,39,.18)`                                        |
| Primary CTA / FAB     | `0 12px 28px rgba(30,58,138,.4), 0 4px 8px rgba(30,58,138,.2)`         |
| Sheet                 | `0 -10px 40px rgba(15,23,42,.2)`                                       |
| Now-dot navy          | `0 0 0 1px #1E3A8A, 0 2px 4px rgba(30,58,138,.3)`                      |

---

## 6. Bileşenler

### 6.1 Date strip pill (yatay 7 gün)
- 48×64, radius 14.
- **Default:** beyaz zemin, 1px hair border, gün adı muted, tarih ink.
- **Selected:** ink zemin, beyaz tipo, gölge.
- **Today (selected değilken):** 1.5px red border + alt 4×4 red dot.
- **Today + Selected:** ink zemin, alt 4×4 white dot.

### 6.2 Timeline row
- Grid `52 28 1fr`. Saat sağa hizalı, padding-right 10, padding-top 12.
- **Past row:** time `#9CA3AF`/500, dot 10×10 round `past`, 2px bg-rengi border (track halo).
- **Future row:** time ink/600, dot 14×14 round `navy`, 3px white border + halo shadow.
- **Block row:** dot 12×12 square 45° rotate `#94A3B8`.

### 6.3 NOW row
- Time 12/700 red, sağa hizalı.
- Pulse dot ortada (kırmızı 14px + animated halka).
- 2px red çizgi, sağ margin 18.

### 6.4 Cards
- **DoneCard:** sade satır (kart değil) — isim üstü çizili `mutedAlt`, servis · dk meta, sağda 18×18 round `hair` zeminde gri check.
- **UpcomingCard:** 12 radius, surface, hair border, listed shadow. 36×36 avatar (radius 10, blue gradient, `navy` initial), isim 14/600, mavi servis 12/500, sağda chevron.
- **BlockCard:** dashed `hairAlt` border, `surfaceAlt` zemin, ortalı UPPERCASE `#64748B` 12/700 letter-spacing 2 — örn `ÖĞLE ARASI · 60dk`.

### 6.5 Buttons
- **Primary CTA / FAB:** `navy` zemin, beyaz tipo, radius 14–16, padding 14–16, listed CTA shadow.
- **Aksiyon kart (Ara/Mesaj/Düzenle):** `blueSoft` veya `surfaceAlt` zemin, 12 radius, dikey emoji+label.
- **Danger button:** `redSoft` zemin, `red` tipo, 1px `#FECACA` border, 12 radius.
- **Active state:** `transform: scale(0.985)`, transition 80ms.

### 6.6 Inputs (sheet içi)
- Zemin `bg`, 1.5px `hair` border, 10 radius, 12×14 padding, 14/regular, ink.
- Label: 11/600 UPPERCASE muted, letter-spacing 0.6, alt margin 6.
- Service chip grid 2 sütun: seçili `blueSoft` + `navy` border + `navy` tipo; default beyaz + hair border.

### 6.7 Bottom sheet
- Surface zemin, üst köşe 24, sheet shadow, slide-up `cubic-bezier(.4,0,.2,1)` 280ms.
- Backdrop `rgba(15,23,42,.45)` fade 200ms.
- Grabber 40×4 hair, üst 10/6.

### 6.8 iOS chrome (sadece web preview)
- `IOSDevice` 390×844 + status bar 9:41 + glass pill (44 yükseklik, blur 12 saturate 180, içe-shine).
- Mobil RN tarafına taşıma — Expo zaten status bar yönetiyor.

---

## 7. Animasyon

| Olay              | Süre    | Easing                 |
|-------------------|---------|------------------------|
| Button press      | 80ms    | ease                   |
| Sheet slide       | 280ms   | cubic-bezier(.4,0,.2,1)|
| Backdrop fade     | 200ms   | ease                   |
| Date pill select  | 150ms   | ease                   |
| Pulse halo        | 1600ms  | ease-out infinite      |
| Barber pole       | 6000ms  | linear infinite        |

---

## 8. Sayfa Envanteri

> Her brief'in ilk cümlesi: "Tasarım dili `DESIGN.md`'de tanımlı; aşağıdakini birebir o dile uydur."

### Mobile

#### M1 · `(auth)/login.tsx` — Giriş
- **Amaç:** berberin email + şifre ile Supabase auth'a girişi.
- **Layout:** centered, dikey. Üstte logo/eyebrow, başlık "Giriş Yap", iki input (Email, Şifre), primary CTA "Giriş Yap" (navy), footer "Hesabın yok mu?" link.
- **State:** loading → CTA içinde spinner; hata → Alert (RN native).
- **Klavye:** KeyboardAvoidingView, iOS padding behavior.

#### M2 · `(app)/_layout.tsx` — Tab bar
- **Amaç:** 3 sekme — Randevular / Blok / Ayarlar.
- **Stil:** tab bar `bg`, üst border `hair`, aktif `navy`, pasif `muted`. Header gizli (her ekran kendi başlığını çiziyor).
- **İkonlar:** lucide veya tek-renk svg; emoji kullanma (mockup'ta emoji vardı, RN'de svg'ye geç).

#### M3 · `(app)/index.tsx` — Randevular (ana ekran)
- **Amaç:** günün ajandası, NOW indicator, geçmiş/gelecek ayrımı, yeni randevu ekleme, randevu detay.
- **Spec:** `app.jsx` birebir. Header eyebrow + başlık + tarih + 7-day strip, sonra timeline (past gri / future barber-pole), NOW pulse, FAB "Yeni Randevu", iki bottom sheet (NewSheet, DetailSheet).
- **Boş gün:** 64 round pill ikon (`surfaceAlt`), "Henüz randevu yok" 16/600 + meta açıklama.
- **Pull-to-refresh:** tabii (RN `RefreshControl`).

#### M4 · `(app)/block.tsx` — Slot Blokla
- **Amaç:** "şu andan itibaren X dk" diye hızlı blok ekleme (yürüyen müşteri / mola / kişisel).
- **Layout:** dikey ScrollView. Bölümler:
  1. Eyebrow `BLOK EKLE`, başlık "Slotu Blokla".
  2. Süre grid 3×2 chip (15/30/45/60/90/120 dk) — chip stili 6.6 servis chip ile aynı.
  3. Sebep listesi (Yürüyen Müşteri / Mola / Kişisel) — radio liste, seçili `blueSoft` + `navy` border.
  4. Primary CTA "Bloğu Ekle".
- **Onay:** Alert ile başarı mesajı + reset.

#### M5 · `(app)/settings.tsx` — Ayarlar
- **Amaç:** Widget token'ları yönet (oluştur/listele/sil) + çıkış.
- **Layout:** ScrollView. Bölümler:
  1. Eyebrow `AYARLAR`, başlık "Ayarlar".
  2. **Widget Token'ları** — section başlık + "Yeni Token Oluştur" primary CTA (navy).
  3. Token listesi: her satır kart (label, son kullanım tarihi, sil butonu — danger style).
  4. Alt: "Çıkış Yap" danger button.
- **Boş:** ortalı pill ikon + "Henüz token yok".

### Web

#### W1 · `app/layout.tsx` — Root
- **Amaç:** HTML iskelet.
- **Body:** `bg` (#F8FAFC), ink text, antialiased. Tailwind config bu paleti yansıtacak.
- **Font:** Inter via next/font.

#### W2 · `app/[slug]/page.tsx` — Berber profil sayfası
- **Amaç:** müşteri tarafı — berberi tanıt, servisleri seç, slot seç, randevu al.
- **Layout (desktop):** iki kolon — sol berber kartı (foto, isim, adres, telefon link), sağ booking flow. Mobil: tek kolon, berber kartı üstte.
- **Hero:** üstte berber adı 30/700, eyebrow "BERBER · ONLİNE RANDEVU" kırmızı, küçük adres satırı muted.

#### W3 · `app/[slug]/BookingFlow.tsx` — Booking akışı
- **Amaç:** servis seç → tarih seç → slot seç → modal'da bilgi gir → onayla.
- **Bölümler:**
  1. **ServiceSelector** — kartlı liste, seçili `blueSoft` + `navy` border. Servis adı + süre + fiyat.
  2. **Tarih şeridi** — 14 günlük yatay scroll (mobil mockup date strip ile aynı stil — 48×64 pill).
  3. **SlotGrid** — 3-4 sütun grid, her slot pill (radius 10, hair border). Default beyaz, hover hair koyulaşır, dolu disabled (mutedAlt çizgili), seçili navy zemin beyaz tipo.
  4. **BookingModal** — bottom sheet (mobil) / center modal (desktop). İçinde isim, telefon, opsiyonel not + primary CTA "Randevuyu Onayla".
- **Loading:** slot grid'de skeleton pill'ler (hair zemin, pulse).
- **Başarı:** modal yerini yeşil değil — `navy` rozet + "Randevunuz alındı" + tarih/saat özeti + "Yeni randevu" link.

#### W4 · `app/not-found.tsx` — 404
- **Layout:** centered, 30/700 başlık "Berber Bulunamadı", muted alt metin, ana sayfaya dön linki (navy).

---

## 9. Paylaşım kuralları (her sayfa brief'inde tekrar et)

1. **Sadece `DESIGN.md`'deki tokenleri kullan.** Yeni hex uydurma.
2. **Toprak ton yasak.** Krem/rust/kahve önerirsen brief reddedilecek.
3. **Birebir referans:** mobil ana ekran için `app.jsx`'i aç, kopyala — yorum katma.
4. **Berber direği animasyonu** mobilde `expo-linear-gradient` + `Animated.Value` ile, web'de pure CSS.
5. **iOS chrome (`ios-frame.jsx`) sadece web preview için**, RN'de yok.
6. **Türkçe metin** her yerde — "Şimdi", "Yeni Randevu", "İptal Et", "Tamamlandı".
7. **Tarih/saat:** `Europe/Istanbul`, gün adı `Pzt-Paz`, ay `Ocak-Aralık`.
