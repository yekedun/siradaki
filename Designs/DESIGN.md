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

| Token | Hex | Kullanım |
|---|---|---|
| `bg` | `#F8FAFC` | Sayfa zemini (soğuk gri-beyaz) |
| `surface` | `#FFFFFF` | Kart, sheet, modal zemini |
| `surfaceAlt` | `#F1F5F9` | İkincil yüzey (block kart, ikon zemini) |
| `ink` | `#111827` | Birincil metin, ikon |
| `muted` | `#6B7280` | İkincil metin, label |
| `mutedAlt` | `#9CA3AF` | Üstü çizili / disabled metin |
| `hair` | `#E5E7EB` | Border, ayraç |
| `hairAlt` | `#CBD5E1` | Dashed border, vurgulu ayraç |
| `past` | `#D1D5DB` | Geçmiş timeline track + nokta |
| `red` | `#DC2626` | NOW indicator, today rozeti, danger |
| `redSoft` | `#FEF2F2` | Danger button bg (border `#FECACA`) |
| `blue` | `#2563EB` | Servis satırı, ikincil aksiyon |
| `blueSoft` | `#EFF6FF` | Aktif chip / aksiyon kartı zemini |
| `navy` | `#1E3A8A` | **Birincil CTA**, FAB, avatar gradient sonu |
| `avatarGr` | `#DBEAFE → #EFF6FF` | Avatar 135° linear gradient |

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

| Yer | Shadow |
|---|---|
| Upcoming card | `0 1px 2px rgba(17,24,39,.04), 0 4px 8px rgba(17,24,39,.04)` |
| Date pill (selected) | `0 6px 14px rgba(17,24,39,.18)` |
| Primary CTA / FAB | `0 12px 28px rgba(30,58,138,.4), 0 4px 8px rgba(30,58,138,.2)` |
| Sheet | `0 -10px 40px rgba(15,23,42,.2)` |
| Now-dot navy | `0 0 0 1px #1E3A8A, 0 2px 4px rgba(30,58,138,.3)` |

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

| Olay | Süre | Easing |
|---|---|---|
| Button press | 80ms | ease |
| Sheet slide | 280ms | cubic-bezier(.4,0,.2,1) |
| Backdrop fade | 200ms | ease |
| Date pill select | 150ms | ease |
| Pulse halo | 1600ms | ease-out infinite |
| Barber pole | 6000ms | linear infinite |

---

## 8. Sayfa Envanteri

> Her brief'in ilk cümlesi: "Tasarım dili `DESIGN.md`'de tanımlı; aşağıdaki sayfa envanterine göre bu ekranı tasarla."

---

### Owner Mobile App (`apps/mobile/app/(owner)/`)

#### M1 · `(auth)/login.tsx` — Giriş
- **Amaç:** dükkan sahibinin veya personelin oturum açması.
- **İçerik:** BrandMark (56×56 navy + kırmızı çapraz çizgi), eyebrow, başlık, email input, şifre input, birincil CTA.
- **Modals / Sheets:** yok.
- **Navigasyon:** başarılı giriş → Expo Router auth guard → `(owner)` veya `(app)` tab'ına.
- **Hata:** `Alert("Giriş Başarısız", error.message)`.
- **Boş:** email veya şifre boş → CTA pasif (opacity 0.6).
- **UI Metinleri:**
  - Eyebrow: `"BERBER · DÜKKAN PANELİ"`
  - Başlık: `"Giriş Yap"`
  - Lead: `"Randevu panelini açmak için hesabına giriş yap."`
  - Label/Placeholder (1): `"E-POSTA"` / `"berber@dukkan.com"`
  - Label/Placeholder (2): `"ŞİFRE"` / `"••••••••"`
  - CTA: `"Giriş Yap"`
  - Footer: `"Hesabın yok mu?"` + link `"Kayıt ol"` (şu an işlevsiz)
  - Hata Alert başlık: `"Giriş Başarısız"` — tetikleyici: yanlış email / şifre

#### M2 · `(owner)/_layout.tsx` — Owner tab yapısı
- **Amaç:** owner uygulamasının ana alt tab navigasyonu.
- **Sekmeler (fiili):** Özet · Ajanda · Kazanç · Ekip · Ayarlar.
- **Modals / Sheets:** yok (her tab kendi sayfası).
- **Navigasyon:** sekme basımı → ilgili ekran. `"Kazanç"` sekmesi `commission_enabled = false` iken gizlenir (`href: null`).
- **UI Metinleri (tab etiketleri + ikonlar):**
  - `"Özet"` (bar-chart-2) · `"Ajanda"` (calendar) · `"Ekip"` (users) · `"Kazanç"` (credit-card) · `"Ayarlar"` (settings)

#### M3 · `(owner)/index.tsx` — Özet
- **Amaç:** işletmenin günlük durumunu ve 30 günlük öngörülerini tek bakışta sunmak.
- **İçerik:** StaffPicker (yatay chip şeridi; "Tüm Ekip" + personel başlatıcıları), 3 KPI kartı (Bugün Toplam / Tamamlanan / Tahmini ₺), Öngörüler kutusu (En Çok Tercih / En Yoğun Gün), personel satır listesi.
- **Modals / Sheets:** yok.
- **Navigasyon:** personel satırına tıklama → client-side filtre (sayfa değişmez); pull-to-refresh → veri yenileme.
- **Hata:** veri çekilemezse loading → null render (kullanıcıya hata gösterilmez, sessiz başarısız).
- **Boş:** personel satırı yok → "Bu personele ait randevu yok." satırı.
- **UI Metinleri:**
  - Eyebrow: `"DÜKKAN ÖZET"`
  - Başlık: `"Bugün"`
  - Alt başlık: dinamik · örn. `"7 Mayıs 2026, Çarşamba"`
  - StaffPicker hepsi chip: `"Tüm Ekip"` (users ikon)
  - KPI etiketleri: `"Bugün Toplam"` · `"Tamamlanan"` · `"Tahmini (₺)"`
  - Öngörüler bölüm başlığı: `"ÖNGÖRÜLER (30 GÜN)"`
  - Insight satır etiketleri: `"En Çok Tercih Edilen"` · `"En Yoğun Gün"`
  - Insight boş değer: `"Veri Yok"`
  - Personel bölüm başlığı: `"PERSONEL DETAYI"` (filtre aktifken) / `"USTA BAZINDA"` (hepsi seçiliyken)
  - Personel sayaç: `"{n} randevu"`
  - Boş satır: `"Bu personele ait randevu yok."`

#### M4 · `(owner)/agenda.tsx` — Ajanda
- **Amaç:** seçilen gün için tüm personelin randevularını kanban düzeninde yönetmek.
- **İçerik:** haftalık gün şeridi (üst, sabitlenmiş), yatay scroll personel sütunları (200px genişlik), sütun başlığı (isim + randevu/blok sayısı), AppointmentCard (drag handle dahil), BlockCard (dashed), "+ Randevu Ekle" dashed CTA.
- **Modals / Sheets:** `AddAppointmentModal` (pageSheet, yeni + düzenleme modu).
- **Navigasyon:** gün şeridinden gün seçimi → veri yenileme; sütundaki "+ Randevu Ekle" → AddAppointmentModal (ilgili personel + seçili gün önseçili); Realtime — `appointment_slots` + `block_slots` kanalları (debounce 300ms).
- **Drag-drop akışı:** karta uzunca basma + yatay sürükleme → hedef sütun highlight (columnDropTarget) → bırakma → `update_appointment_atomic` RPC; başarısızlıkta veri geri yüklenir.
- **Hata:** çakışma → `Alert("Çakışma")`; diğer RPC hataları → `Alert("Taşınamadı")`.
- **Boş:** personel sütunu boş → "Randevu yok" etiketi; personel listesi boş → sadece boş yatay alan.
- **UI Metinleri:**
  - Gün kısaltmaları: `"Pzt"` `"Sal"` `"Çar"` `"Per"` `"Cum"` `"Cmt"` `"Paz"`
  - Ay kısaltmaları: `"Oca"` `"Şub"` `"Mar"` `"Nis"` `"May"` `"Haz"` `"Tem"` `"Ağu"` `"Eyl"` `"Eki"` `"Kas"` `"Ara"`
  - Sütun sayaç: `"{n} randevu"` veya `"{n} randevu · {k} blok"`
  - Kart zaman satırı: `"{HH:MM} · {dur} dk"`
  - Blok kartı etiketi: `"Bloke"`
  - Ekle CTA: `"+ Randevu Ekle"` (dashed, navy border)
  - Boş sütun: `"Randevu yok"`
  - Drag hata — hizmet yok: Alert `"Taşınamadı"` / `"Bu randevunun kayıtlı hizmeti yok."` — tetikleyici: `appt.service_id = null`
  - Drag çakışma: Alert `"Çakışma"` / `error.message` — tetikleyici: RPC `23P01` veya `P0001`
  - Drag genel hata: Alert `"Taşınamadı"` / `error.message`
- **AddAppointmentModal UI Metinleri** *(bu modal M4 ve M9'da paylaşılır)*:
  - Header başlık: `"Yeni Randevu"` (yeni) / `"Randevuyu Düzenle"` (düzenleme)
  - Header butonlar: `"İptal"` (sol, muted) · `"Kaydet"` (sağ, navy)
  - Alan etiketleri: `"Müşteri Adı"` · `"Telefon"` · `"Hizmet"` · `"Tarih"` · `"Saat"` · `"Süre"` · `"ÖZET"`
  - Placeholder ad: `"Örn. Ahmet Yılmaz"` · Placeholder telefon: `"0(5xx) xxx xx xx"`
  - Hizmet chip içeriği: `"{name}"` + `"{duration_min} dk · {price}₺"`
  - Hizmet boş başlık: `"Aktif hizmet yok"` · Hizmet boş metin: `"Randevu eklemek için önce hizmet tanımlanmalı."`
  - Süre bilgi (hizmet seçiliyken): `"Süre seçilen hizmetten gelir: {dur} dk"`
  - Özet metni: `"{serviceName} · {dateLabel} · {timeLabel}"` · Alt: `"Bitiş: {endLabel} ({dur} dk)"`
  - Doğrulama Alert'leri:
    - `"Eksik"` / `"Müşteri adı en az 2 karakter olmalı"` — ad < 2 karakter
    - `"Eksik"` / `"Randevu eklemek için önce aktif bir hizmet tanımlanmalı."` — dükkanın hiç aktif hizmeti yok
    - `"Eksik"` / `"Kayıtlı bir hizmet seçmelisin"` — hizmet seçilmeden Kaydet
    - `"Geçersiz Saat"` / `"Geçmiş bir saate randevu eklenemez"` — yeni randevu + geçmiş saat
    - `"Çakışma"` / `error.message || "Bu saat artık müsait değil. Farklı bir saat seç."` — RPC `23P01` / `P0001`
    - `"Hata"` / `error.message` — diğer RPC hataları

#### M5 · `(owner)/team.tsx` — Ekip
- **Amaç:** personel listesi, aktif/pasif durumu, çalışma saatleri ve komisyon oranı yönetimi.
- **İçerik:** "Personel ekle" CTA (navy), personel kart listesi (avatar + ad + durum chip + komisyon etiketi + aksiyon ikonları).
- **Modals / Sheets:**
  - `StaffScheduleModal` (pageSheet) — saat ikonu → 7 günlük çalışma saati ve mola düzenleme.
  - "Personel Ekle" Modal (fade) — ad giriş alanı.
  - "Komisyon Oranı" Modal (fade) — `commission_enabled` açıksa % giriş alanı.
- **Navigasyon:** saat ikonu → StaffScheduleModal; % ikonu → komisyon modal (yalnızca `commission_enabled`); Pause/Play → aktif/pasif Alert onay; "Personel Ekle" CTA → Personel Ekle Modal.
- **Hata:** RPC veya DB hatası → `Alert("Hata", error.message)`; komisyon % geçersiz → `Alert("Geçersiz", "0-100 arası gir")`.
- **Boş:** personel yokken → "Henüz personel yok. Yeni personel ekleyin."
- **UI Metinleri — ekran:**
  - Eyebrow: `"EKİP YÖNETİMİ"`
  - Başlık: `"Ustalar"`
  - CTA: `"Personel ekle"` (user-plus ikon)
  - Durum chip: `"Aktif"` (#16a34a) / `"Pasif"` (muted, kart opaklık 0.65)
  - Komisyon etiketi: `"%{oran} komisyon"` veya `"Komisyon yok"`
  - Toggle Alert başlık: `"Durumu Değiştir"` · mesaj: `"{name} personelini pasif yap?"` / `"...aktif yap?"`
  - Toggle butonlar: `"Vazgeç"` · `"Pasif yap"` (destructive) / `"Aktif yap"`
  - Boş: `"Henüz personel yok. Yeni personel ekleyin."`
- **UI Metinleri — Personel Ekle Modal:**
  - Başlık: `"Personel ekle"` · Açıklama: `"Randevu alacak usta adını gir."`
  - Placeholder: `"Ad Soyad"` · Butonlar: `"Vazgeç"` · `"Ekle"` (navy)
  - Başarı Alert: `"Başarılı"` / `"{name} başarıyla eklendi."`
  - Doğrulama: `"Geçersiz"` / `"Geçerli bir ad gir."` — ad < 2 karakter
  - Hata Alert: `"Hata"` / `error.message`
- **UI Metinleri — Komisyon Oranı Modal:**
  - Başlık: `"Komisyon Oranı"` · Açıklama: `"{name} için yüzde oran gir. Boş bırakırsan komisyon kapanır."`
  - Placeholder: `"Örn. 50"` · Butonlar: `"Vazgeç"` · `"Kaydet"` (navy)
  - Doğrulama: `"Geçersiz"` / `"0 ile 100 arasında oran gir."` — NaN veya aralık dışı
- **UI Metinleri — StaffScheduleModal:**
  - Eyebrow: `"ÇALIŞMA SAATLERİ"` · Başlık: `"{staff.name}"`
  - Gün kısaltmaları: `"Paz"` `"Pzt"` `"Sal"` `"Çar"` `"Per"` `"Cum"` `"Cmt"`
  - Toggle başlık: `"Çalışıyor"` · alt metin: `"Bu gün aktif"` / `"Bu gün tatil / kapalı"`
  - Bölüm başlıkları: `"ÇALIŞMA SAATLERİ"` · `"MOLA (OPSİYONEL)"`
  - Alan etiketleri: `"Açılış"` · `"Kapanış"` · `"Mola Başlangıç"` · `"Mola Bitiş"`
  - Placeholder çalışma: `"09:00"` · Placeholder mola: `"--:--"`
  - İpucu metni: `"Mola saatleri müşteri randevu ekranında otomatik kapalı görünür."`
  - Kaydet CTA: `"Tüm Günleri Kaydet"` (save ikon)
  - Doğrulama Alert'leri:
    - `"Geçersiz Saat"` / `"{gün}: çalışma saati HH:MM formatında olmalı."` — yanlış format
    - `"Geçersiz Aralık"` / `"{gün}: açılış kapanıştan önce olmalı."` — work_start ≥ work_end
    - `"Geçersiz Mola"` / `"{gün}: mola saati HH:MM formatında olmalı."` — mola yanlış format
    - `"Geçersiz Mola"` / `"{gün}: mola başlangıcı bitişten önce olmalı."` — break_start ≥ break_end
  - Başarı Alert: `"Kaydedildi"` / `"{staff.name} çalışma saatleri güncellendi."`

#### M6 · `(owner)/settings.tsx` — Owner Ayarları
- **Amaç:** komisyon modülü toggle, widget tokenları ve hesap aksiyonlarını toplamak.
- **İçerik:** hesap kartı (avatar + dükkan adı + email + "Dükkan Sahibi" etiketi), "OPERASYON MODÜLLERİ" satırı (komisyon toggle), "WIDGET TOKENLARI" bölümü (oluştur + liste + sil), Çıkış butonu (danger).
- **Modals / Sheets:** yok (Alert kullanır).
- **Alert'ler:** token oluşturuldu bilgisi; token silme onayı (destructive); çıkış onayı (destructive).
- **Navigasyon:** yok — tüm aksiyonlar bu ekranda tamamlanır.
- **Hata:** `generateWidgetToken` / `deleteWidgetToken` → `Alert("Hata", error.message)`.
- **Boş:** token listesi boş → kilit ikonu + "Henüz token yok".
- **UI Metinleri:**
  - Eyebrow: `"DÜKKAN AYARLARI"` · Başlık: `"Ayarlar"`
  - Lead: `"Widget tokenlarını yönet ve hesabından çıkış yap."`
  - Hesap kartı rozeti: `"Dükkan Sahibi"`
  - Bölüm başlıkları: `"OPERASYON MODÜLLERİ"` · `"WIDGET TOKENLARI"`
  - Komisyon satır başlık: `"Komisyon takibi"`
  - Komisyon meta (açık): `"Personel komisyonu ve kazanç raporu açık."` · (kapalı): `"Randevu akışı değişmez."`
  - Komisyon durum etiketi: `"Açık"` (#059669) / `"Kapalı"` (muted)
  - Token oluştur CTA: `"Yeni Token Oluştur"` (plus ikon, navy)
  - Token meta: `"wgt_{id4}…{id4} · son {tarih}"` (shortId + last_used veya created)
  - Sil butonu: `"Sil"` (redSoft zemin)
  - Token sil Alert: `"Token sil"` / `"Bu token silinirse widget çalışmayı durduracak."` → `"İptal"` · `"Sil"` (destructive)
  - Token oluşturuldu Alert: `"Token Oluşturuldu"` / `"Widget'ınıza otomatik yüklendi.\n\nToken ID: {id}…"`
  - Çıkış CTA: `"Çıkış yap"` (danger, redSoft zemin)
  - Çıkış Alert: `"Çıkış"` / `"Hesaptan çıkmak istediğine emin misin?"` → `"Vazgeç"` · `"Çıkış yap"` (destructive)
  - Boş token: `"Henüz token yok"` (lock ikon)
  - Alt not: `"Berber Panel · Sahip Ekranı"`

#### M7 · `(owner)/earnings.tsx` — Kazanç
- **Amaç:** seçilen dönem için dükkanın komisyon ve ciro raporunu göstermek.
- **İçerik:** dönem seçici şerit (Bugün / 7 gün / 30 gün), 3 KPI kartı (Tamamlanan ciro / Usta komisyonu / Dükkan payı), personel dağılım listesi (her satır: tamamlanan randevu + komisyon + ciro + pay), pull-to-refresh.
- **Modals / Sheets:** yok.
- **Navigasyon:** dönem chip seçimi → veri yenileme (API çağrısı).
- **Hata:** DB veya RPC hatası → `Alert("Hata", error.message)`.
- **Boş / Devre dışı:** `commission_enabled = false` → kilit ikonu + "Komisyon takibi kapalı" + yönlendirme metni.
- **UI Metinleri:**
  - Eyebrow: `"KOMİSYON"` · Başlık: `"Kazanç"`
  - Dönem chip etiketleri: `"Bugün"` · `"7 gün"` · `"30 gün"`
  - KPI başlıkları: `"Tamamlanan ciro"` (trending-up) · `"Usta komisyonu"` (percent) · `"Dükkan payı"` (credit-card)
  - Para birimi formatı: `"{n} TL"` (tr-TR toLocaleString, kuruş/100)
  - Bölüm başlığı: `"PERSONEL DAĞILIMI"`
  - Personel satır meta: `"{n} tamamlanan randevu"`
  - Tutar alt etiketleri: `"Ciro {amount}"` · `"Pay {amount}"`
  - Devre dışı başlık: `"Komisyon takibi kapalı"` (lock ikon)
  - Devre dışı metin: `"Ayarlardan açılınca kazanç raporu görünür."`
  - Hata Alert: `"Hata"` / `error.message`

---

### Usta (Staff) Mobile App (`apps/mobile/app/(app)/`)

> Bu tab grubu widget token ile veya personel girişiyle erişilen **usta görünümüdür**. Sahip değil, personel kullanır.

#### M8 · `(app)/_layout.tsx` — Usta tab yapısı
- **Amaç:** personelin kendi randevu ve blok akışı için navigasyon.
- **Sekmeler (fiili):** Randevular · Blok · Ayarlar.
- **UI Metinleri (tab etiketleri + ikonlar):**
  - `"Randevular"` (calendar) · `"Blok"` (slash) · `"Ayarlar"` (settings)

#### M9 · `(app)/index.tsx` — Randevular (Timeline)
- **Amaç:** ustanın o güne ait randevu ve bloklarını timeline görünümünde göstermek; aksiyonları yönetmek.
- **İçerik:** sabitlenmiş header (eyebrow + başlık + tarih etiketi + haftalık gün şeridi), Timeline (geçmiş/gelecek/bugün 3-state), berber direği animasyonlu track, NOW indicator (kırmızı puls dot), DoneRow (üstü çizili), UpcomingRow (kart + avatar + chevron), BlockRow (dashed), FAB "Yeni Randevu".
- **Modals / Sheets:**
  - `AppointmentDetailSheet` (bottom sheet, animasyonlu slide-up) — saat+dk başlığı, müşteri adı, hizmet; aksiyon butonları: Ara / Mesaj / Düzenle; alt satır: İptal Et (danger) + Tamamlandı (navy).
  - `AddAppointmentModal` (pageSheet, yeni + düzenleme modu).
- **Navigasyon:** gün şeridinden gün seçimi → veri yenileme; UpcomingRow'a tıklama → AppointmentDetailSheet; "Düzenle" → AppointmentDetailSheet kapanır (220ms) → AddAppointmentModal; FAB → AddAppointmentModal; Realtime — `appointments` + `blocks` kanalları.
- **Hata:** tamamlama/iptal RPC hatası → `Alert("Hata")`; AddAppointmentModal çakışma → `Alert("Çakışma")`.
- **Boş:** o gün randevu + blok yoksa → EmptyDay (takvim ikonu + tarih bazlı mesaj + "Yeni Randevu" yönlendirmesi).
- **UI Metinleri — ekran:**
  - Eyebrow: `"BERBER · DÜKKAN PANELİ"` · Başlık: `"Randevular"`
  - Tarih etiketi: `"{gün} {ay} {yıl}, {kısa gün}"` · örn. `"7 Mayıs 2026, Çar"`
  - Gün kısaltmaları: `"Pzt"` `"Sal"` `"Çar"` `"Per"` `"Cum"` `"Cmt"` `"Paz"`
  - Ay adları: `"Ocak"` `"Şubat"` `"Mart"` `"Nisan"` `"Mayıs"` `"Haziran"` `"Temmuz"` `"Ağustos"` `"Eylül"` `"Ekim"` `"Kasım"` `"Aralık"`
  - UpcomingRow: `"{HH:MM} · {dur} dk"` + müşteri adı + servis adı (mavi)
  - DoneRow: müşteri adı (üstü çizili, mutedAlt) + `"{servis} · {dur}dk"` (mutedAlt)
  - BlockRow: `"BLOKE · {dur}dk"` (uppercase, letter-spacing 2, blockInk renk)
  - FAB: `"Yeni Randevu"` (plus ikon, full-width navy)
  - Boş başlık: `"Henüz randevu yok"` (takvim ikon + surfaceAlt daire)
  - Boş metin: `"{gün} {ay} için randevu bulunmuyor.\nYeni Randevu butonuna basarak ekleyebilirsiniz."`
  - Tamamlama hata Alert: `"Hata"` / `error.message || "Randevu tamamlanamadi."` — tetikleyici: RPC başarısız
  - İptal hata Alert: `"Hata"` / `error.message || "Randevu iptal edilemedi."` — tetikleyici: RPC başarısız
- **UI Metinleri — AppointmentDetailSheet:**
  - Eyebrow: `"{HH:MM} · {dur}DK"` (blue, uppercase, letter-spacing 1.2)
  - Müşteri adı: büyük (24/700, ink)
  - Hizmet: `services.name` yoksa `"Randevu"` (14/500, muted)
  - Aksiyon butonları: `"Ara"` (phone) · `"Mesaj"` (message-circle) · `"Düzenle"` (edit-2, muted zemin)
  - `"Ara"` ve `"Mesaj"` butonları `customer_phone = null` ise devre dışı (opacity 0.5)
  - Alt butonlar: `"İptal Et"` (danger, redSoft) · `"Tamamlandı"` (navy)

#### M10 · `(app)/block.tsx` — Takvimi Kapat
- **Amaç:** şu andan itibaren belirli süre için ustanın takvimini kapatmak.
- **İçerik:** NowBadge (kırmızı puls dot + saat + blok başlangıç notu), Süre grid (6 seçenek: 15/30/45/60/90/120 dk), Sebep listesi (Anlık müşteri / Mola / Kişisel), dashed önizleme kartı, FAB "Kapat".
- **Modals / Sheets:** yok.
- **Navigasyon:** FAB → `create-manual-block` edge function → Alert sonucu.
- **Hata:** çakışma → `Alert("Çakışma", message)`; diğer hata → `Alert("Hata", message)`.
- **Boş:** yok — her zaman seçim mevcut (default: 30 dk, Mola).
- **UI Metinleri:**
  - Eyebrow: `"BLOK EKLE"` · Başlık: `"Takvimi Kapat"`
  - Lead: `"Şu andan itibaren seçtiğin süre boyunca takvim kapalı görünür."`
  - NowBadge başlık: `"ŞU AN · {HH:MM}"` (red, uppercase, letter-spacing 0.4)
  - NowBadge alt: `"Blok başlangıç saati otomatik atanır."` (muted)
  - Bölüm etiketleri: `"Süre"` · `"Sebep"` · `"Önizleme"`
  - Süre chip'leri: `"{dk}"` + `"dakika"` — 15 / 30 / 45 / 60 / 90 / 120
  - Sebep satırları (başlık + meta): `"Anlık müşteri"` / `"Şu anda gelen müşteri için"` · `"Mola"` / `"Kahve / dinlenme arası"` · `"Kişisel"` / `"Telefon, evrak vs."`
  - Önizleme kartı: `"{SEBEP_BÜYÜK} · {dur}DK"` (uppercase, dashed, blockInk)
  - FAB: `"Kapat"` (navy, full-width)
  - Başarı Alert: `"Takvim kapatıldı"` / `"{dur} dakika kapalı görünecek."`
  - Çakışma Alert: `"Çakışma"` / `error.message` — tetikleyici: saat zaten bloklu/randevulu
  - Genel hata Alert: `"Hata"` / `error.message`

#### M11 · `(app)/settings.tsx` — Hesabım
- **Amaç:** personelin hesap bilgilerini görmek ve çıkış yapmak.
- **İçerik:** hesap kartı (avatar + ad + email), Çıkış Yap butonu (danger).
- **Modals / Sheets:** yok (Alert kullanır).
- **Navigasyon:** Çıkış Yap → `Alert` onay → `supabase.auth.signOut()`.
- **Hata:** yok.
- **Boş:** yok.
- **UI Metinleri:**
  - Eyebrow: `"AYARLAR"` · Başlık: `"Hesabım"`
  - Çıkış CTA: `"Çıkış Yap"` (danger, redSoft zemin)
  - Alert: `"Çıkış"` / `"Hesaptan çıkmak istediğine emin misin?"` → `"Vazgeç"` · `"Çıkış Yap"` (destructive)
  - Alt not: `"Berber Panel · Usta Ekranı"`

---

### Archived Customer Mobile App (`archive/customer/`)

> Yalnızca tarihsel referans. Müşteri rezervasyonu `apps/web`'de; usta/sahip operasyonu `apps/mobile`'da.

| Kod | Route | Amaç |
|-----|-------|-------|
| C1 | `(auth)/login.tsx` | Müşteri girişi |
| C2 | `(auth)/verify.tsx` | SMS doğrulama |
| C3 | `(auth)/setup.tsx` | İlk profil kurulumu |
| C4 | `(app)/_layout.tsx` | Müşteri tab iskeleti |
| C5 | `(app)/index.tsx` | Ana sayfa / yönlendirme |
| C6 | `(app)/appointments.tsx` | Randevularım (liste + iptal) |
| C7 | `(app)/profile.tsx` | Profil yönetimi |
| C8 | `booking/step1-service.tsx` | Servis seçimi |
| C9 | `booking/step2-barber.tsx` | Berber seçimi |
| C10 | `booking/step3-slot.tsx` | Tarih + saat seçimi |
| C11 | `booking/step4-confirm.tsx` | Onay özeti |
| C12 | `booking/success.tsx` | Rezervasyon başarılı |

---

### Web Booking (`apps/web/src/`)

#### W1 · `src/app/layout.tsx` — Web Root
- **Amaç:** Next.js global container, `bg-bg` zemin, tipografi.
- **Modals / Sheets:** yok.
- **Navigasyon:** yok (shell).
- **UI Metinleri:** yok (görünür metin içermez).

#### W2 · `src/app/[slug]/page.tsx` — Berber Profil + Rezervasyon Sayfası
- **Amaç:** tek sayfada dükkanı tanıtıp rezervasyon akışını başlatmak.
- **İçerik:** iki sütun grid (md: `380px + 1fr`); sol — `ProfileCard` (avatar/initials 4:3 görsel, eyebrow, dükkan adı, bio); sağ — `BookingFlow`.
- **Modals / Sheets:** `BookingModal` (BookingFlow içinden tetiklenir).
- **Navigasyon:** slug bulunamazsa → `notFound()` → W4; adım tamamlandıkça koşullu bölümler görünür.
- **Hata:** slug DB'de yoksa → 404 sayfasına yönlendirme.
- **Boş:** hizmet veya personel yoksa BookingFlow boş adım gösterir.
- **UI Metinleri — ProfileCard:**
  - Eyebrow: `"BERBER · ONLINE RANDEVU"`
  - H1: `{shop.display_name}` (30/700, ink)
  - Bio: `{shop.bio}` (13/normal, muted) — varsa gösterilir
  - Avatar placeholder: baş harfler (44px bold, navy, blueSoft zemin)

#### W3 · `src/app/[slug]/BookingFlow.tsx` — Rezervasyon Akışı
- **Amaç:** 4 adımlı koşullu rezervasyon deneyimi.
- **Adımlar (koşullu görünürlük):**
  1. **Hizmet Seç** — `ServiceSelector` chip listesi; seçim → adım 2 açılır.
  2. **Usta Seç** — "Fark Etmez" kartı + personel kartları; seçim → adım 3 açılır.
  3. **Tarih** — 14 günlük yatay date strip; seçim → adım 4 açılır.
  4. **Saat** — `SlotGrid`, "Devam Et" CTA (slot seçiliyse aktif).
- **Modal:** `BookingModal` (W3a) — "Devam Et" basılınca overlay olarak açılır.
- **Navigasyon:** hizmet veya usta değişince seçili slot sıfırlanır; Realtime — `appointment_slots` + `block_slots` kanalları.
- **Hata:** slot fetch hatası → `slotError` → SlotGrid içinde gösterilir + "Tekrar Dene" butonu.
- **Boş:** `isClosed = true` → SlotGrid "Bu gün için çalışma saati tanımlanmamış."; tüm slotlar dolu → "Bu günde müsait saat kalmadı. Başka bir gün seçin."
- **UI Metinleri:**
  - Adım numaraları: `1` `2` `3` `4` (22px navy daire, bold)
  - Adım başlıkları: `"Hizmet Seç"` · `"Usta Seç"` · `"Tarih"` · `"Saat"` (11/600, uppercase, muted)
  - "Usta Seç" özel kart: `"Fark Etmez"` + `"Uygun personele atanır"` (alt metin)
  - Date strip gün kısaltmaları: `"Paz"` `"Pzt"` `"Sal"` `"Çar"` `"Per"` `"Cum"` `"Cmt"`
  - Date strip ay kısaltmaları: `"Oca"` `"Şub"` `"Mar"` `"Nis"` `"May"` `"Haz"` `"Tem"` `"Ağu"` `"Eyl"` `"Eki"` `"Kas"` `"Ara"` (3 harf kırpılmış)
  - CTA (slot yok): `"Saat Seç"` (pasif, surfaceAlt zemin, cursor not-allowed)
  - CTA (slot seçili): `"{HH:MM}'da Devam Et"` (navy, aktif)
  - ServiceSelector boş: `"Henüz hizmet tanımlanmamış."` (mutedAlt)
  - Slot dolu — tooltip: `"Dolu"` (title attribute, üstü çizili)
  - SlotGrid hata başlık: `"Müsaitlik bilgisi alınamadı."` (red, bold)
  - SlotGrid hata alt: `"Bağlantıyı kontrol edip tekrar deneyin."` (muted)
  - SlotGrid hata CTA: `"Tekrar Dene"` (navy button)
  - SlotGrid kapalı / boş: `"Bu gün için çalışma saati tanımlanmamış."` (mutedAlt)
  - SlotGrid tam dolu: `"Bu günde müsait saat kalmadı. Başka bir gün seçin."` (mutedAlt)

#### W3a · `BookingModal` — Rezervasyon Onay Overlay (web)
- **Amaç:** seçilen randevuyu onaylatıp müşteri bilgilerini almak.
- **4 durum / adım:** `form` → `loading` → `success` / `error`.
- **Form:** Ad Soyad (zorunlu, min 2), Telefon (opsiyonel), Not (opsiyonel textarea); İptal + Onayla CTA'ları.
- **Navigasyon:** `success` → overlay kapanır, slot listesi yenilenir; `error` çakışma → overlay kapanır, kullanıcı yeni slot seçer; `error` diğer → "Tekrar Dene" butonu ile form'a dönüş.
- **Hata (409 çakışma):** "Bu saat az önce doldu. Lütfen başka saat seçin." + "Saat Seç" butonu.
- **Hata (çalışma saati dışı):** "Bu saat artık çalışma saatleri dışında." + sayfa yenileme önerisi.
- **Hata (diğer):** hata metni + "Tekrar Dene" butonu.
- **Başarı:** "Onaylandı" rozeti, "Randevunuz alındı" başlığı, personel+hizmet+tarih özeti, SMS notu, "Yeni randevu" CTA.
- **UI Metinleri:**
  - Modal başlık: `"Randevuyu Onayla"` (20/700)
  - Alt başlık: `"{staffLabel} · {service.name} · {dateLabel}, {timeLabel}"` (13/normal, muted)
  - Alan etiketleri: `"Ad Soyad"` · `"Telefon"` · `"Not (opsiyonel)"`
  - Placeholder ad: `"örn. Ahmet Yılmaz"` · Placeholder tel: `"0(5xx) xxx xx xx"` · Placeholder not: `"Saç uzunluğu, tercih, vs."`
  - Butonlar form: `"İptal"` (surfaceAlt, flex-1) · `"Randevuyu Onayla"` (navy, flex-2; disabled: opacity 0.4 — ad < 2 karakter)
  - Loading metin: `"Randevu oluşturuluyor..."`
  - Başarı rozeti: `"Onaylandı"` (uppercase, blueSoft zemin, navy)
  - Başarı başlık: `"Randevunuz alındı"` (24/700)
  - Başarı meta: `"{staff_name} · {service_name}"` + `"{tarih saat}"` + `"Onay SMS'i yolda."` (mutedAlt)
  - Başarı CTA: `"Yeni randevu"` (surfaceAlt, full-width)
  - Hata rozeti: `"Hata"` (uppercase, redSoft zemin, red)
  - Hata mesajı — çakışma: `"Bu saat az önce doldu. Lütfen listeden başka bir saat seçin."` — tetikleyici: HTTP 409 + `should_refetch_availability`
  - Hata mesajı — çalışma saati: `"Bu saat artık çalışma saatleri dışında. Sayfayı yenileyip güncel saatleri görün."` — tetikleyici: HTTP 409 + response içinde `"calisma saati"`
  - Hata mesajı — bağlantı: `"Bağlantı hatası. Lütfen tekrar deneyin."` — tetikleyici: fetch exception
  - Hata mesajı — diğer: `data.error ?? "Randevu oluşturulamadı."` — tetikleyici: HTTP !ok, non-409
  - Hata CTA — çakışma: `"Saat Seç"` (tek buton, overlay kapanır)
  - Hata CTA — diğer: `"Kapat"` + `"Tekrar Dene"` (form adımına döner)

#### W4 · `src/app/not-found.tsx` — 404
- **Amaç:** geçersiz slug veya kayıp sayfa durumunu karşılamak.
- **İçerik:** eyebrow "404 · SAYFA YOK", büyük "404" sayısı, berber direği animasyonu (CSS `animate-barber`), başlık, açıklama, "Ana Sayfaya Dön" CTA (navy).
- **Modals / Sheets:** yok.
- **Navigasyon:** "Ana Sayfaya Dön" → `/`.
- **UI Metinleri:**
  - Eyebrow: `"404 · SAYFA YOK"` (11/600, uppercase, red)
  - Büyük sayı: `"404"` (96/extrabold, navy, letter-spacing -3px, tabular-nums)
  - Başlık: `"Berber Bulunamadı"` (30/700, ink)
  - Açıklama: `"Aradığın berber profili artık mevcut değil ya da bağlantı yanlış yazılmış olabilir. Ana sayfaya dönüp tekrar deneyebilirsin."` (14/normal, muted)
  - CTA: `"Ana Sayfaya Dön"` (navy, href="/")
  - Alt not: `"Berber · v1.0.0"` (11/600, uppercase, mutedAlt)

---

## 9. Paylaşım kuralları (her sayfa brief'inde tekrar et)

1. **Sadece `DESIGN.md`'deki tokenleri kullan.** Yeni hex uydurma.
2. **Toprak ton yasak.** Krem/rust/kahve önerirsen brief reddedilecek.
3. **Birebir referans:** mobil ana ekran için `app.jsx`'i aç, kopyala — yorum katma.
4. **Berber direği animasyonu** mobilde `expo-linear-gradient` + `Animated.Value` ile, web'de pure CSS.
5. **iOS chrome (`ios-frame.jsx`) sadece web preview için**, RN'de yok.
6. **Türkçe metin** her yerde — "Şimdi", "Yeni Randevu", "İptal Et", "Tamamlandı".
7. **Tarih/saat:** `Europe/Istanbul`, gün adı `Pzt-Paz`, ay `Ocak-Aralık`.
