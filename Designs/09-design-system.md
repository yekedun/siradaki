# 09 — Design System

> Token kaynak hiyerarşisi, renk/tip/spacing/radius/shadow/motion sistemleri, web (Tailwind) ve mobil (RN `theme.ts`) tüketim pattern'leri, token eşleme tabloları.

Önceki: [`08-forms.md`](./08-forms.md) · Sonraki: [`10-routing.md`](./10-routing.md)

---

## 1. Kaynak hiyerarşisi

```
Claude Design ortamı (bu proje)
├── colors_and_type.css        ← KANONİK token tanımları
├── README.md                  ← Tasarım kararlarının gerekçesi
└── ui_kits/web/ + mobile/     ← Referans bileşen reçeteleri

        │  tasarım kararları buradan iner
        ▼

apps/web/tailwind.config.ts    ← Web implementasyonu
apps/mobile/lib/theme.ts       ← Mobil implementasyonu
```

**Altın kural:** Token değerlerinde çelişki olduğunda `colors_and_type.css` kazanır. `tailwind.config.ts` ve `theme.ts` bu kaynağı tüketen implementasyon dosyalarıdır — kaynak değil.

`packages/shared/src/constants.ts` yalnızca iş mantığı sabitleri içeriyor (`SLOT_GRANULARITY_MIN`, `MIN_CANCEL_NOTICE_MINUTES` vb.). Tasarım token'ı buraya **girmez**.

---

## 2. Renk sistemi

### 2.1 Kanonik skala (`colors_and_type.css`)

| Token | Hex | Anlam |
|---|---|---|
| `--ink-900` | `#0B1220` | Birincil metin, primary button zemin |
| `--ink-700` | `#1F2438` | Güçlü heading yedek |
| `--slate-700` | `#2F3649` | İkincil heading |
| `--slate-500` | `#5B6477` | Meta, caption |
| `--slate-400` | `#8590A4` | Üçüncül, disabled |
| `--slate-300` | `#B4BBC8` | Placeholder |
| `--slate-200` | `#D6DBE5` | Hairline border |
| `--slate-100` | `#EEF1F5` | Divider, sunken surface |
| `--slate-50` | `#F7F8FA` | Sayfa canvas |
| `--slate-0` | `#FFFFFF` | Kart yüzeyi |
| `--brand-600` | `#1E3A8A` | **Ana aksan — lacivert navy** |
| `--brand-500` | `#3B5BB8` | Hover |
| `--brand-100` | `#DDE3F2` | Tint / arka plan |
| `--mint-600` | `#00B894` | Tamamlandı / canlı durum |
| `--mint-100` | `#C6F3E5` | Mint tint |
| `--umber-600` | `#6F4A14` | Kazanç / komisyon / warning |
| `--umber-100` | `#ECE6DC` | Umber tint |
| `--coral-600` | `#A0303F` | Tehlike / iptal / çakışma |
| `--coral-100` | `#EFD3D8` | Coral tint |

### 2.2 Semantik aliaslar

```css
--bg:           var(--slate-50)   /* sayfa zemini */
--bg-elevated:  var(--slate-0)    /* kart yüzeyi */
--bg-sunken:    var(--slate-100)  /* içe gömülü alan */
--fg-1:         var(--ink-900)    /* birincil metin */
--fg-2:         var(--slate-700)  /* ikincil metin */
--fg-3:         var(--slate-500)  /* meta/caption */
--fg-4:         var(--slate-400)  /* disabled */
--border:       var(--slate-200)  /* hairline */
--border-strong: var(--ink-900)   /* seçili / aktif */
--accent:       var(--brand-600)  /* CTA, link */
--positive:     var(--mint-600)
--warning:      var(--umber-600)
--danger:       var(--coral-600)
```

### 2.3 Web — Tailwind isimlendirmesi

`tailwind.config.ts` aynı hex değerleri farklı isimlerle tanımlıyor. Tasarım sistemi ismi ile Tailwind class ismi her zaman bire bir örtüşmez:

| Kanonik token | Tailwind adı | Kullanım örneği |
|---|---|---|
| `--slate-50` | `bg` | `bg-bg`, `bg-[#F8FAFC]` |
| `--slate-0` | `surface` | `bg-surface` |
| `--slate-100` | `surfaceAlt` | `bg-surfaceAlt` |
| `--ink-900` | `ink` | `text-ink` |
| `--slate-500` | `muted` | `text-muted` |
| `--slate-400` | `mutedAlt` | `text-mutedAlt` |
| `--slate-200` | `hair` | `border-hair` |
| `--slate-100` | `hairAlt` | `border-hairAlt` |
| `--brand-600` | `navy` | `bg-navy text-white` |
| `--coral-600` | `red` (DEFAULT) | `text-red` |
| `--brand-100` | `blue` (soft) | `bg-blue-soft` |

> ⚠️ **"red" ve "blue" isim seçimi kafa karıştırıcı** — `red` kanonikte `--coral-600` (sober brick), Tailwind'ın kendi `red-600`'ü değil. Yeni bileşen yazarken kanonik rengi arıyorsan Tailwind adını değil hex değerini teyit et.

### 2.4 Mobil — `T` objesi (`apps/mobile/lib/theme.ts`)

```ts
import { T } from '@/lib/theme';

// Kullanım örnekleri
backgroundColor: T.navy      // --brand-600
color:           T.ink        // --ink-900
color:           T.muted      // --slate-500
borderColor:     T.line       // --slate-200 (= --border)
backgroundColor: T.bg         // --slate-50
backgroundColor: T.surface    // --slate-0
backgroundColor: T.danger     // --coral-600
backgroundColor: T.positive   // --mint-600
```

`T` objesi ayrıca `timeline` (NOW çizgisi kırmızısı) ve `avatar` (avatarFrom / avatarTo gradient renkleri) gibi bileşen-spesifik token'lar içeriyor.

**Legacy aliaslar** (`T.accent`, `T.aptBg`, `T.blockBg` vb.) çalışıyor ama yeni kod bu isimleri kullanmamalı — üstteki semantik isimler tercih edilmeli.

---

## 3. Tipografi

### 3.1 Tip skalası (`colors_and_type.css`)

| Stil | `--fs-*` | Ağırlık | Satır aralığı | Tracking |
|---|---|---|---|---|
| Display XL | 64px | 700 | `--lh-tight` (1.08) | `--track-display` (−0.02em) |
| Display | 44px | 700 | 1.08 | −0.02em |
| H1 | 34px | 700 | 1.08 | −0.02em |
| H2 | 28px | 700 | `--lh-snug` (1.22) | −0.02em |
| H3 | 22px | 600 | 1.22 | −0.012em |
| H4 | 18px | 600 | 1.22 | — |
| Body | 15px | 400 | `--lh-base` (1.45) | — |
| Lead | 17px | 400 | `--lh-loose` (1.6) | — |
| Meta | 13px | 400 | 1.45 | — |
| **Overline** | **12px** | **600** | **1.0** | **`--track-overline` (0.16em) · UPPERCASE** |

### 3.2 Font ailesi

**Kanonik:** `"Montserrat"` — 400 / 500 / 600 / 700 ağırlıkları, `.otf` dosyaları `/fonts/` dizininde.

**Web implementasyonu:** `tailwind.config.ts`'te font stack `-apple-system, BlinkMacSystemFont, Inter, system-ui` olarak tanımlı — **Montserrat yok**.

> ⚠️ **Font uyumsuzluğu — açık konu.** Kanonik tipografi Montserrat'a dayanıyor (tracking değerleri, ağırlık seçimi bu aile için optimize edildi). Web'de Inter/system-ui kullanılıyor. Eğer Montserrat web'e eklenmeyecekse kanonik tracking değerleri (`--track-overline: 0.16em`) Inter için yeniden ayarlanmalı — İnter daha dar bir aile, aynı tracking oranında fazla açık görünür.
>
> Mobilde sistem fontu kullanılıyor (RN default) — Montserrat hiçbir platformda aktif değil.

### 3.3 Overline — marka imzası

```css
.overline {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--fg-3);
}
```

Web'de Tailwind karşılığı: `text-xs font-semibold tracking-[0.16em] uppercase text-muted`

Mobil karşılığı:
```ts
{
  fontSize: 12,
  fontWeight: '600',
  letterSpacing: 1.4,   // theme.ts: letterSpacing.eyebrow
  textTransform: 'uppercase',
  color: T.muted,
}
```

---

## 4. Spacing

4px base scale. `--space-1` (4px) ile `--space-10` (72px) arası 10 adım.

| Token | px | Kullanım kuralı |
|---|---|---|
| `--space-1` | 4 | İkon padding, chip iç boşluk |
| `--space-2` | 8 | Satır içi eleman gap, form label → input |
| `--space-3` | 12 | Input iç padding, list satır padding |
| `--space-4` | 16 | Standart yatay gutter |
| `--space-5` | 20 | Kart iç padding (mobil) |
| `--space-6` | 24 | Kart iç padding (web), modal header |
| `--space-7` | 32 | Bölüm arası gap |
| `--space-8` | 40 | Hero bölüm padding |
| `--space-9` | 56 | Büyük dikey boşluk |
| `--space-10` | 72 | Sayfa üst marjin |

**Tailwind'da sayısal scale:** `p-4` = 16px (Tailwind 4px base ile örtüşüyor). Token map özellikle tanımlanmadıysa standart Tailwind spacing kullanılıyor.

**Mobil'de:** Spacing değerleri genellikle magic number olarak yazılıyor (`gap: 10`, `marginTop: 40`). `--space-*` token'larının karşılıkları `theme.ts`'te tanımlı değil — sayı sabitleri doğrudan kullanılıyor.

> ⚠️ **Mobil spacing token'ları yok.** `theme.ts`'e `spacing` nesnesi eklenmesi önerilir (`S = { xs:4, sm:8, md:16, lg:24, xl:32 }` gibi) — magic number'ları temizler, PRD'deki kural değişince tek yerden güncellenir.

---

## 5. Border radius

Aynı değerler üç yerde tanımlı — kanonik, Tailwind ve RN:

| Kanonik (`--radius-*`) | px | Tailwind | RN `R.*` | Nerede |
|---|---|---|---|---|
| `--radius-xs` | 4 | `rounded` | — | Küçük chip içi |
| `--radius-sm` | 8 | `rounded-lg` | — | — |
| `--radius-md` | 12 | `rounded-xl` | `R.card` | Kart, input, primary button |
| `--radius-lg` | 18 | — | `R.sheet` | Bottom sheet, modal |
| `--radius-xl` | 24 | — | — | Hero yüzey (KPI card) |
| `--radius-pill` | 999 | `rounded-full` | `R.pill` | Status chip, avatar |

> Tailwind'da `rounded-xl` = 12px (Tailwind default), `rounded-2xl` = 16px. `tailwind.config.ts`'te `borderRadius.card: '12px'` gibi özel isimler tanımlanmış — `rounded-card`, `rounded-cta` gibi class'lar tercih edilmeli, sayısal approximation değil.

---

## 6. Gölge ve yükseklik

### 6.1 Kanonik gölgeler

```css
--shadow-xs: 0 1px 0 rgba(11,18,32,0.04);                       /* satır rafı */
--shadow-sm: 0 1px 2px rgba(11,18,32,0.05), 0 1px 0 ...;        /* kart */
--shadow-md: 0 6px 18px -10px rgba(11,18,32,0.22), 0 1px 0 ...; /* hover/expanded */
--shadow-lg: 0 24px 48px -22px rgba(11,18,32,0.30), 0 2px 0 ...; /* modal/sheet */
```

**Kural:** Her shadow **hairline border ile birlikte** kullanılır. Shadow görsel kontrast sağlar, hairline düşük kontrastta (baskı, projeksiyon) yüzeyi ayırır.

### 6.2 Web — Tailwind shadow isimleri

`tailwind.config.ts`'te `card`, `pill`, `cta`, `sheet`, `now` (kırmızı halo, timeline NOW göstergesi) olarak tanımlı. Kanonik `--shadow-sm/md/lg` ile bire bir örtüşmüyor:

| Tailwind | Karşılık | Nerede |
|---|---|---|
| `shadow-card` | `--shadow-sm` yakını | Standart kart |
| `shadow-cta` | `--shadow-md` yakını | CTA buton, aktif kart |
| `shadow-sheet` | `--shadow-lg` yakını | Modal, bottom sheet |
| `shadow-now` | Özel — kırmızı halo | Timeline NOW çizgisi |

### 6.3 Mobil — `Shadow` objesi

```ts
import { Shadow } from '@/lib/theme';

style={{ ...Shadow.card }}   // iOS shadow reçetesi
style={{ ...Shadow.sheet }}  // Daha yüksek elevation
```

Android için `elevation` fallback'i `Shadow` objesinin içinde — platform koşullu değil, iOS shadow + Android elevation tek nesnede birleştirilmiş.

---

## 7. Motion

| Token | Değer | Kullanım |
|---|---|---|
| `--ease-out` | `cubic-bezier(.2,.7,.2,1)` | Varsayılan — neredeyse her şey |
| `--ease-soft` | `cubic-bezier(.32,.72,.0,1)` | Sheet/modal açılma |
| `--ease-in` | `cubic-bezier(.6,.0,.8,.2)` | Çıkış animasyonu |
| `--dur-fast` | 120ms | Mikro etkileşim (buton press) |
| `--dur-base` | 200ms | Standart geçiş |
| `--dur-slow` | 360ms | Sheet/modal |

**Web'de:** Tailwind `transition` utility + `duration-200` / `ease-out` yeterli çoğu durumda. Sheet animasyonu için inline CSS veya Framer Motion.

**Mobil'de:** `Animated.timing` veya `LayoutAnimation`. `--ease-out` karşılığı `Easing.bezier(.2,.7,.2,1)`.

> **Yasaklar:** Bounce spring yok. Confetti yok. Skeleton shimmer yok. Sayfa girişi tek 180ms opacity geçişi — slide yok.

**Web'e özgü iki animasyon:**
- `pulse` — NOW timeline göstergesi için kırmızı halo genişleme animasyonu
- `barber-scroll` — `/[slug]` 404'ünde berber direği kaydırma (dekoratif)

---

## 8. Bileşen-seviyesi kurallar

### 8.1 Kart

```
background:    var(--bg-elevated)          // --slate-0
border:        1px solid var(--border)     // --slate-200
border-radius: var(--radius-md)            // 12px
box-shadow:    var(--shadow-sm)
padding:       var(--space-5)              // 20px mobil, 24px web
```

- İç bölüm için `--bg-sunken` (--slate-100) arka plan, border yok.
- Sol border aksan rengi **hiçbir zaman kullanılmaz.**
- Kart üzerinde hover: `--shadow-md` + `scale(0.985)` 120ms.

### 8.2 Buton

| Varyant | Zemin | Metin | Radius | Yükseklik |
|---|---|---|---|---|
| Primary (CTA) | `--brand-600` | white | `--radius-md` (12px) | 48px |
| Secondary | `--bg-elevated` | `--ink-900` | `--radius-md` | 48px |
| Destructive | `--coral-600` | white | `--radius-md` | 48px |
| Ghost | transparent | `--brand-600` | `--radius-md` | 48px |
| FAB | `--brand-600` | white | `--radius-lg` (16px = R.fab) | 56px |

Disabled state: `opacity: 0.45` — renk değişmez, sadece şeffaflaşır.

### 8.3 Chip / pill

- Status chip: `--radius-pill`, 28px yükseklik, 12px padding.
- Filter chip: seçilmemişse `border: 1px --border`, seçilmişse `border: 1px --border-strong` + hafif `--bg-sunken`.

### 8.4 Input

```
border:        1px solid var(--border)
border-radius: var(--radius-md)   // R.input = 10px  ← web ile fark var (§11)
height:        48px
padding:       0 var(--space-4)
focus:         outline: 2px var(--focus-ring), offset: 2px
```

### 8.5 Overline + başlık grubu

Her ekran başlığı standart üçlü: overline → h1 → meta.

```html
<span class="overline">BERBER · DÜKKAN PANELİ</span>
<h1>Bugün</h1>
<p class="meta">16 Mayıs 2026, Cumartesi</p>
```

---

## 9. Mobil tüketim özeti

```ts
import { T, R, Shadow } from '@/lib/theme';

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,           // #FFFFFF
    borderWidth: 1,
    borderColor: T.line,                   // --slate-200
    borderRadius: R.card,                  // 12
    ...Shadow.card,
    padding: 20,
  },
  heading: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: T.ink,
  },
  overline: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: T.muted,
  },
  cta: {
    backgroundColor: T.navy,
    borderRadius: R.cta,                   // 14
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

**Inline style sadece layout için:** `flex: 1`, `marginTop: 40`, `gap: 10` gibi tek seferlik layout değerleri. Renk hiçbir zaman raw hex olarak inline yazılmaz.

---

## 10. Web tüketim özeti

```tsx
// Tailwind class öncelikli
<div className="bg-surface border border-hair rounded-xl shadow-card p-5">
  <span className="text-xs font-semibold tracking-[0.16em] uppercase text-muted">
    BERBER · DÜKKAN PANELİ
  </span>
  <h1 className="text-ink text-[34px] font-bold tracking-[-0.02em] leading-tight mt-1">
    Bugün
  </h1>
</div>

// Primary CTA
<button className="bg-navy text-white rounded-card h-12 px-6 font-semibold
                   hover:bg-[#15296B] transition-colors duration-200">
  Randevu Al
</button>
```

`globals.css` base token'ları + Tailwind config custom değerleri. Bileşen kodu Tailwind class, base styles CSS custom property.

---

## 11. Açık konular / uyumsuzluklar

- ⚠️ **Font uyumsuzluğu** — Kanonik: Montserrat. Web: Inter/system-ui. Mobil: sistem fontu. Montserrat hiçbir platformda aktif değil. Karar: Montserrat web+mobil'e eklenecek mi yoksa sistem fontuna göre tracking değerleri yeniden ayarlanacak mı?
- ⚠️ **Input radius farkı** — Kanonik `--radius-md` = 12px. Web `tailwind.config` → `borderRadius.input` = 10px. Mobil `R.input` = 10px. 2px fark küçük ama kanonik ile tutarsız. Karar: kanonik 12'ye mi çıkılacak, yoksa token 10'a mı inecek?
- ⚠️ **Mobil spacing token'ları yok** — Magic number'lar `StyleSheet` içinde dağınık. `theme.ts`'e `S` (spacing) objesi eklenmeli.
- ⚠️ **`--umber` web'de tanımlı değil** — `tailwind.config.ts`'te `red` ve `navy` var ama `umber` / `mint` yok. Kazanç/komisyon rengi ve tamamlandı rengi Tailwind class'ı yok, raw hex yazılıyor. `amber` veya `umber` olarak eklenmeli.
- ⚠️ **Tailwind renk isimlerinin kanonik isimlerle uyuşmaması** — `red` → aslında coral, `navy` → aslında brand. Yeni geliştirici `text-red` class'ını "Tailwind kırmızısı" sanabilir. `tailwind.config.ts` yorumlarında kanonik karşılıkları belgelenebilir.
- ⚠️ **Legacy alias temizliği** — `T.accent`, `T.aptBg`, `T.blockBg` `theme.ts`'te hâlâ var. Semantik isimler (`T.navy`, `T.surface`) yerleşince bunlar kaldırılabilir; ama önce tüm kullanım yerleri taranmalı.
- 🚧 **Dark mode yok** — Token sistemi light-only. `prefers-color-scheme` desteği roadmap'te; şu an `colors_and_type.css`'te `@media (prefers-color-scheme: dark)` bloğu yok.
- ⚠️ **`POLE_COLORS` tasarım sistemine girmemeli** — `theme.ts`'teki berber direği çizgi renkleri (`T.pole.*`) sektör-neutral tasarım yönüyle çelişiyor. 404 sayfası haricinde bileşenlerde kullanılmamalı.

---

**Sonraki:** [`10-routing.md`](./10-routing.md) — Expo Router grup yapısı, Next.js App Router segment haritası, deep link pattern'leri, auth guard'lar.
