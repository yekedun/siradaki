# Berber Randevu — Sayfa Envanteri

---

## Owner Mobile App (`apps/mobile/app/(owner)/`)

#### M1 · `(auth)/login.tsx` — Giriş
- **Amaç:** dükkan sahibinin veya personelin oturum açması.
- **İçerik:** marka alanı, başlık, açıklama metni, email alanı, şifre alanı, giriş butonu, kayıt bağlantısı.
- **Modals / Sheets:** yok.
- **Navigasyon:** başarılı giriş → Expo Router auth guard → `(owner)` veya `(app)` tab'ına.
- **Hata:** `Alert("Giriş Başarısız", error.message)`.
- **Boş:** email veya şifre boş → giriş butonu pasif.
- **UI Metinleri:**
  - Üst etiket: `"BERBER · DÜKKAN PANELİ"`
  - Başlık: `"Giriş Yap"`
  - Lead: `"Randevu panelini açmak için hesabına giriş yap."`
  - Label/Placeholder (1): `"E-POSTA"` / `"berber@dukkan.com"`
  - Label/Placeholder (2): `"ŞİFRE"` / `"••••••••"`
  - Buton: `"Giriş Yap"`
  - Footer: `"Hesabın yok mu?"` + link `"Kayıt ol"` (şu an işlevsiz)
  - Hata Alert başlık: `"Giriş Başarısız"` — tetikleyici: yanlış email / şifre

#### M2 · `(owner)/_layout.tsx` — Owner tab yapısı
- **Amaç:** owner uygulamasının ana alt tab navigasyonu.
- **Sekmeler (fiili):** Özet · Ajanda · Kazanç · Ekip · Ayarlar.
- **Modals / Sheets:** yok (her tab kendi sayfası).
- **Navigasyon:** sekme basımı → ilgili ekran. `"Kazanç"` sekmesi `commission_enabled = false` iken gizlenir (`href: null`).
- **UI Metinleri:**
  - `"Özet"` · `"Ajanda"` · `"Ekip"` · `"Kazanç"` · `"Ayarlar"`

#### M3 · `(owner)/index.tsx` — Özet
- **Amaç:** işletmenin günlük durumunu ve 30 günlük öngörülerini tek bakışta sunmak.
- **İçerik:** personel filtresi, günlük randevu sayıları, tamamlanan randevu sayısı, tahmini gelir, 30 günlük öngörüler, personel bazında randevu özeti.
- **Modals / Sheets:** yok.
- **Navigasyon:** personel satırına tıklama → client-side filtre (sayfa değişmez); pull-to-refresh → veri yenileme.
- **Hata:** veri çekilemezse loading → null render (kullanıcıya hata gösterilmez, sessiz başarısız).
- **Boş:** personel satırı yok → "Bu personele ait randevu yok." satırı.
- **UI Metinleri:**
  - Üst etiket: `"DÜKKAN ÖZET"`
  - Başlık: `"Bugün"`
  - Alt başlık: dinamik · örn. `"7 Mayıs 2026, Çarşamba"`
  - Personel filtresi hepsi seçeneği: `"Tüm Ekip"`
  - KPI etiketleri: `"Bugün Toplam"` · `"Tamamlanan"` · `"Tahmini (₺)"`
  - Öngörüler bölüm başlığı: `"ÖNGÖRÜLER (30 GÜN)"`
  - Insight satır etiketleri: `"En Çok Tercih Edilen"` · `"En Yoğun Gün"`
  - Insight boş değer: `"Veri Yok"`
  - Personel bölüm başlığı: `"PERSONEL DETAYI"` (filtre aktifken) / `"USTA BAZINDA"` (hepsi seçiliyken)
  - Personel sayaç: `"{n} randevu"`
  - Boş satır: `"Bu personele ait randevu yok."`

#### M4 · `(owner)/agenda.tsx` — Ajanda
- **Amaç:** seçilen gün için tüm personelin randevularını yönetmek.
- **İçerik:** gün seçimi, personel sütunları, personel başına randevu ve blok sayısı, randevu listesi, blok listesi, randevu ekleme aksiyonu.
- **Modals / Sheets:** `AddAppointmentModal` (yeni + düzenleme modu).
- **Navigasyon:** gün seçimi → veri yenileme; "+ Randevu Ekle" → AddAppointmentModal (ilgili personel + seçili gün önseçili); Realtime — `appointment_slots` + `block_slots` kanalları (debounce 300ms).
- **Drag-drop akışı:** karta uzunca basma + yatay sürükleme → hedef personele bırakma → `update_appointment_atomic` RPC; başarısızlıkta veri geri yüklenir.
- **Hata:** çakışma → `Alert("Çakışma")`; diğer RPC hataları → `Alert("Taşınamadı")`.
- **Boş:** personel sütunu boş → "Randevu yok" etiketi; personel listesi boş → randevu gösterilmez.
- **UI Metinleri:**
  - Gün kısaltmaları: `"Pzt"` `"Sal"` `"Çar"` `"Per"` `"Cum"` `"Cmt"` `"Paz"`
  - Ay kısaltmaları: `"Oca"` `"Şub"` `"Mar"` `"Nis"` `"May"` `"Haz"` `"Tem"` `"Ağu"` `"Eyl"` `"Eki"` `"Kas"` `"Ara"`
  - Sütun sayaç: `"{n} randevu"` veya `"{n} randevu · {k} blok"`
  - Randevu zaman satırı: `"{HH:MM} · {dur} dk"`
  - Blok etiketi: `"Bloke"`
  - Ekle butonu: `"+ Randevu Ekle"`
  - Boş sütun: `"Randevu yok"`
  - Drag hata — hizmet yok: Alert `"Taşınamadı"` / `"Bu randevunun kayıtlı hizmeti yok."` — tetikleyici: `appt.service_id = null`
  - Drag çakışma: Alert `"Çakışma"` / `error.message` — tetikleyici: RPC `23P01` veya `P0001`
  - Drag genel hata: Alert `"Taşınamadı"` / `error.message`
- **AddAppointmentModal UI Metinleri** *(bu modal M4 ve M9'da paylaşılır)*:
  - Header başlık: `"Yeni Randevu"` (yeni) / `"Randevuyu Düzenle"` (düzenleme)
  - Header butonlar: `"İptal"` · `"Kaydet"`
  - Alan etiketleri: `"Müşteri Adı"` · `"Telefon"` · `"Hizmet"` · `"Tarih"` · `"Saat"` · `"Süre"` · `"ÖZET"`
  - Placeholder ad: `"Örn. Ahmet Yılmaz"` · Placeholder telefon: `"0(5xx) xxx xx xx"`
  - Hizmet içeriği: `"{name}"` + `"{duration_min} dk · {price}₺"`
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
- **İçerik:** personel ekleme aksiyonu, personel listesi, personel adı, personel durumu, komisyon bilgisi, çalışma saatleri düzenleme, komisyon oranı düzenleme, aktif/pasif değiştirme.
- **Modals / Sheets:**
  - `StaffScheduleModal` — 7 günlük çalışma saati ve mola düzenleme.
  - "Personel Ekle" Modal — ad giriş alanı.
  - "Komisyon Oranı" Modal — `commission_enabled` açıksa yüzde giriş alanı.
- **Navigasyon:** çalışma saati aksiyonu → StaffScheduleModal; komisyon aksiyonu → komisyon modal (yalnızca `commission_enabled`); aktif/pasif aksiyonu → Alert onay; "Personel Ekle" → Personel Ekle Modal.
- **Hata:** RPC veya DB hatası → `Alert("Hata", error.message)`; komisyon yüzde değeri geçersiz → `Alert("Geçersiz", "0-100 arası gir")`.
- **Boş:** personel yokken → "Henüz personel yok. Yeni personel ekleyin."
- **UI Metinleri — ekran:**
  - Üst etiket: `"EKİP YÖNETİMİ"`
  - Başlık: `"Ustalar"`
  - Buton: `"Personel ekle"`
  - Durum: `"Aktif"` / `"Pasif"`
  - Komisyon etiketi: `"%{oran} komisyon"` veya `"Komisyon yok"`
  - Toggle Alert başlık: `"Durumu Değiştir"` · mesaj: `"{name} personelini pasif yap?"` / `"...aktif yap?"`
  - Toggle butonlar: `"Vazgeç"` · `"Pasif yap"` / `"Aktif yap"`
  - Boş: `"Henüz personel yok. Yeni personel ekleyin."`
- **UI Metinleri — Personel Ekle Modal:**
  - Başlık: `"Personel ekle"` · Açıklama: `"Randevu alacak usta adını gir."`
  - Placeholder: `"Ad Soyad"` · Butonlar: `"Vazgeç"` · `"Ekle"`
  - Başarı Alert: `"Başarılı"` / `"{name} başarıyla eklendi."`
  - Doğrulama: `"Geçersiz"` / `"Geçerli bir ad gir."` — ad < 2 karakter
  - Hata Alert: `"Hata"` / `error.message`
- **UI Metinleri — Komisyon Oranı Modal:**
  - Başlık: `"Komisyon Oranı"` · Açıklama: `"{name} için yüzde oran gir. Boş bırakırsan komisyon kapanır."`
  - Placeholder: `"Örn. 50"` · Butonlar: `"Vazgeç"` · `"Kaydet"`
  - Doğrulama: `"Geçersiz"` / `"0 ile 100 arasında oran gir."` — NaN veya aralık dışı
- **UI Metinleri — StaffScheduleModal:**
  - Üst etiket: `"ÇALIŞMA SAATLERİ"` · Başlık: `"{staff.name}"`
  - Gün kısaltmaları: `"Paz"` `"Pzt"` `"Sal"` `"Çar"` `"Per"` `"Cum"` `"Cmt"`
  - Toggle başlık: `"Çalışıyor"` · alt metin: `"Bu gün aktif"` / `"Bu gün tatil / kapalı"`
  - Bölüm başlıkları: `"ÇALIŞMA SAATLERİ"` · `"MOLA (OPSİYONEL)"`
  - Alan etiketleri: `"Açılış"` · `"Kapanış"` · `"Mola Başlangıç"` · `"Mola Bitiş"`
  - Placeholder çalışma: `"09:00"` · Placeholder mola: `"--:--"`
  - İpucu metni: `"Mola saatleri müşteri randevu ekranında otomatik kapalı görünür."`
  - Kaydet butonu: `"Tüm Günleri Kaydet"`
  - Doğrulama Alert'leri:
    - `"Geçersiz Saat"` / `"{gün}: çalışma saati HH:MM formatında olmalı."` — yanlış format
    - `"Geçersiz Aralık"` / `"{gün}: açılış kapanıştan önce olmalı."` — work_start ≥ work_end
    - `"Geçersiz Mola"` / `"{gün}: mola saati HH:MM formatında olmalı."` — mola yanlış format
    - `"Geçersiz Mola"` / `"{gün}: mola başlangıcı bitişten önce olmalı."` — break_start ≥ break_end
  - Başarı Alert: `"Kaydedildi"` / `"{staff.name} çalışma saatleri güncellendi."`

#### M6 · `(owner)/settings.tsx` — Owner Ayarları
- **Amaç:** komisyon modülü, widget bağlantıları ve hesap aksiyonlarını toplamak.
- **İçerik:** hesap bilgileri, dükkan adı, email, dükkan sahibi etiketi, komisyon takibi ayarı, widget bağlantıları oluşturma/listeleme/silme, çıkış aksiyonu.
- **Modals / Sheets:** yok (Alert kullanır).
- **Alert'ler:** bağlantı oluşturuldu bilgisi; bağlantı silme onayı; çıkış onayı.
- **Navigasyon:** yok — tüm aksiyonlar bu ekranda tamamlanır.
- **Hata:** widget bağlantısı oluşturma / silme → `Alert("Hata", error.message)`.
- **Boş:** widget bağlantısı listesi boş → "Henüz bağlantı yok".
- **UI Metinleri:**
  - Üst etiket: `"DÜKKAN AYARLARI"` · Başlık: `"Ayarlar"`
  - Lead: `"Widget bağlantılarını yönet ve hesabından çıkış yap."`
  - Hesap etiketi: `"Dükkan Sahibi"`
  - Bölüm başlıkları: `"OPERASYON MODÜLLERİ"` · `"WIDGET BAĞLANTILARI"`
  - Komisyon satır başlık: `"Komisyon takibi"`
  - Komisyon meta (açık): `"Personel komisyonu ve kazanç raporu açık."` · (kapalı): `"Randevu akışı değişmez."`
  - Komisyon durum etiketi: `"Açık"` / `"Kapalı"`
  - Bağlantı oluştur butonu: `"Yeni Bağlantı Oluştur"`
  - Bağlantı meta: `"wgt_{id4}…{id4} · son {tarih}"` (shortId + last_used veya created)
  - Sil butonu: `"Sil"`
  - Bağlantı sil Alert: `"Bağlantı sil"` / `"Bu bağlantı silinirse widget çalışmayı durduracak."` → `"İptal"` · `"Sil"`
  - Bağlantı oluşturuldu Alert: `"Bağlantı Oluşturuldu"` / `"Widget'ınıza otomatik yüklendi.\n\nBağlantı ID: {id}…"`
  - Çıkış butonu: `"Çıkış yap"`
  - Çıkış Alert: `"Çıkış"` / `"Hesaptan çıkmak istediğine emin misin?"` → `"Vazgeç"` · `"Çıkış yap"`
  - Boş bağlantı: `"Henüz bağlantı yok"`
  - Alt not: `"Berber Panel · Sahip Ekranı"`

#### M7 · `(owner)/earnings.tsx` — Kazanç
- **Amaç:** seçilen dönem için dükkanın komisyon ve ciro raporunu göstermek.
- **İçerik:** dönem seçimi, tamamlanan ciro, usta komisyonu, dükkan payı, personel dağılım listesi, personel başına tamamlanan randevu ve tutar bilgileri, pull-to-refresh.
- **Modals / Sheets:** yok.
- **Navigasyon:** dönem seçimi → veri yenileme (API çağrısı).
- **Hata:** DB veya RPC hatası → `Alert("Hata", error.message)`.
- **Boş / Devre dışı:** `commission_enabled = false` → "Komisyon takibi kapalı" + yönlendirme metni.
- **UI Metinleri:**
  - Üst etiket: `"KOMİSYON"` · Başlık: `"Kazanç"`
  - Dönem etiketleri: `"Bugün"` · `"7 gün"` · `"30 gün"`
  - KPI başlıkları: `"Tamamlanan ciro"` · `"Usta komisyonu"` · `"Dükkan payı"`
  - Para birimi formatı: `"{n} TL"` (tr-TR toLocaleString, kuruş/100)
  - Bölüm başlığı: `"PERSONEL DAĞILIMI"`
  - Personel satır meta: `"{n} tamamlanan randevu"`
  - Tutar alt etiketleri: `"Ciro {amount}"` · `"Pay {amount}"`
  - Devre dışı başlık: `"Komisyon takibi kapalı"`
  - Devre dışı metin: `"Ayarlardan açılınca kazanç raporu görünür."`
  - Hata Alert: `"Hata"` / `error.message`

---

## Usta (Staff) Mobile App (`apps/mobile/app/(app)/`)

> Bu tab grubu widget bağlantısı ile veya personel girişiyle erişilen **usta görünümüdür**. Sahip değil, personel kullanır.

#### M8 · `(app)/_layout.tsx` — Usta tab yapısı
- **Amaç:** personelin kendi randevu ve blok akışı için navigasyon.
- **Sekmeler (fiili):** Randevular · Blok · Ayarlar.
- **UI Metinleri:**
  - `"Randevular"` · `"Blok"` · `"Ayarlar"`

#### M9 · `(app)/index.tsx` — Randevular
- **Amaç:** ustanın o güne ait randevu ve bloklarını zaman sırasıyla göstermek; aksiyonları yönetmek.
- **İçerik:** tarih bilgisi, gün seçimi, gün içi randevular, gün içi bloklar, mevcut zaman göstergesi, tamamlanmış randevular, gelecek randevular, yeni randevu aksiyonu.
- **Modals / Sheets:**
  - `AppointmentDetailSheet` — saat+süre bilgisi, müşteri adı, hizmet; aksiyon butonları: Ara / Mesaj / Düzenle; alt aksiyonlar: İptal Et + Tamamlandı.
  - `AddAppointmentModal` — yeni + düzenleme modu.
- **Navigasyon:** gün seçimi → veri yenileme; randevuya tıklama → AppointmentDetailSheet; "Düzenle" → AppointmentDetailSheet kapanır → AddAppointmentModal; "Yeni Randevu" → AddAppointmentModal; Realtime — `appointments` + `blocks` kanalları.
- **Hata:** tamamlama/iptal RPC hatası → `Alert("Hata")`; AddAppointmentModal çakışma → `Alert("Çakışma")`.
- **Boş:** o gün randevu + blok yoksa → EmptyDay mesajı + "Yeni Randevu" yönlendirmesi.
- **UI Metinleri — ekran:**
  - Üst etiket: `"BERBER · DÜKKAN PANELİ"` · Başlık: `"Randevular"`
  - Tarih etiketi: `"{gün} {ay} {yıl}, {kısa gün}"` · örn. `"7 Mayıs 2026, Çar"`
  - Gün kısaltmaları: `"Pzt"` `"Sal"` `"Çar"` `"Per"` `"Cum"` `"Cmt"` `"Paz"`
  - Ay adları: `"Ocak"` `"Şubat"` `"Mart"` `"Nisan"` `"Mayıs"` `"Haziran"` `"Temmuz"` `"Ağustos"` `"Eylül"` `"Ekim"` `"Kasım"` `"Aralık"`
  - Gelecek randevu: `"{HH:MM} · {dur} dk"` + müşteri adı + servis adı
  - Tamamlanmış randevu: müşteri adı + `"{servis} · {dur}dk"`
  - Blok: `"BLOKE · {dur}dk"`
  - Buton: `"Yeni Randevu"`
  - Boş başlık: `"Henüz randevu yok"`
  - Boş metin: `"{gün} {ay} için randevu bulunmuyor.\nYeni Randevu butonuna basarak ekleyebilirsiniz."`
  - Tamamlama hata Alert: `"Hata"` / `error.message || "Randevu tamamlanamadi."` — tetikleyici: RPC başarısız
  - İptal hata Alert: `"Hata"` / `error.message || "Randevu iptal edilemedi."` — tetikleyici: RPC başarısız
- **UI Metinleri — AppointmentDetailSheet:**
  - Üst bilgi: `"{HH:MM} · {dur}DK"`
  - Müşteri adı
  - Hizmet: `services.name` yoksa `"Randevu"`
  - Aksiyon butonları: `"Ara"` · `"Mesaj"` · `"Düzenle"`
  - `"Ara"` ve `"Mesaj"` butonları `customer_phone = null` ise devre dışı
  - Alt butonlar: `"İptal Et"` · `"Tamamlandı"`

#### M10 · `(app)/block.tsx` — Takvimi Kapat
- **Amaç:** şu andan itibaren belirli süre için ustanın takvimini kapatmak.
- **İçerik:** mevcut saat, blok başlangıç notu, süre seçenekleri, sebep seçenekleri, önizleme, kapatma aksiyonu.
- **Modals / Sheets:** yok.
- **Navigasyon:** "Kapat" → `create-manual-block` edge function → Alert sonucu.
- **Hata:** çakışma → `Alert("Çakışma", message)`; diğer hata → `Alert("Hata", message)`.
- **Boş:** yok — her zaman seçim mevcut (default: 30 dk, Mola).
- **UI Metinleri:**
  - Üst etiket: `"BLOK EKLE"` · Başlık: `"Takvimi Kapat"`
  - Lead: `"Şu andan itibaren seçtiğin süre boyunca takvim kapalı görünür."`
  - Mevcut saat başlığı: `"ŞU AN · {HH:MM}"`
  - Mevcut saat alt: `"Blok başlangıç saati otomatik atanır."`
  - Bölüm etiketleri: `"Süre"` · `"Sebep"` · `"Önizleme"`
  - Süre seçenekleri: `"{dk}"` + `"dakika"` — 15 / 30 / 45 / 60 / 90 / 120
  - Sebep satırları (başlık + meta): `"Anlık müşteri"` / `"Şu anda gelen müşteri için"` · `"Mola"` / `"Kahve / dinlenme arası"` · `"Kişisel"` / `"Telefon, evrak vs."`
  - Önizleme metni: `"{SEBEP_BÜYÜK} · {dur}DK"`
  - Buton: `"Kapat"`
  - Başarı Alert: `"Takvim kapatıldı"` / `"{dur} dakika kapalı görünecek."`
  - Çakışma Alert: `"Çakışma"` / `error.message` — tetikleyici: saat zaten bloklu/randevulu
  - Genel hata Alert: `"Hata"` / `error.message`

#### M11 · `(app)/settings.tsx` — Hesabım
- **Amaç:** personelin hesap bilgilerini görmek ve çıkış yapmak.
- **İçerik:** hesap bilgileri, personel adı, email, çıkış aksiyonu.
- **Modals / Sheets:** yok (Alert kullanır).
- **Navigasyon:** Çıkış Yap → `Alert` onay → `supabase.auth.signOut()`.
- **Hata:** yok.
- **Boş:** yok.
- **UI Metinleri:**
  - Üst etiket: `"AYARLAR"` · Başlık: `"Hesabım"`
  - Çıkış butonu: `"Çıkış Yap"`
  - Alert: `"Çıkış"` / `"Hesaptan çıkmak istediğine emin misin?"` → `"Vazgeç"` · `"Çıkış Yap"`
  - Alt not: `"Berber Panel · Usta Ekranı"`

---

## Web Booking (`apps/web/src/`)

#### W1 · `src/app/layout.tsx` — Web Root
- **Amaç:** Next.js uygulama kökü.
- **İçerik:** global uygulama sarmalayıcısı.
- **Modals / Sheets:** yok.
- **Navigasyon:** yok (shell).
- **UI Metinleri:** yok (görünür metin içermez).

#### W2 · `src/app/[slug]/page.tsx` — Berber Profil + Rezervasyon Sayfası
- **Amaç:** tek sayfada dükkanı tanıtıp rezervasyon akışını başlatmak.
- **İçerik:** dükkan profil bilgileri, dükkan adı, bio, `BookingFlow`.
- **Modals / Sheets:** `BookingModal` (BookingFlow içinden tetiklenir).
- **Navigasyon:** slug bulunamazsa → `notFound()` → W4; adım tamamlandıkça koşullu bölümler görünür.
- **Hata:** slug DB'de yoksa → 404 sayfasına yönlendirme.
- **Boş:** hizmet veya personel yoksa BookingFlow boş adım gösterir.
- **UI Metinleri — ProfileCard:**
  - Üst etiket: `"BERBER · ONLINE RANDEVU"`
  - Başlık: `{shop.display_name}`
  - Bio: `{shop.bio}` — varsa gösterilir
  - Profil kısa adı: baş harfler

#### W3 · `src/app/[slug]/BookingFlow.tsx` — Rezervasyon Akışı
- **Amaç:** 4 adımlı koşullu rezervasyon deneyimi.
- **Adımlar (koşullu görünürlük):**
  1. **Hizmet Seç** — hizmet listesi; seçim → adım 2 açılır.
  2. **Usta Seç** — "Fark Etmez" seçeneği + personel listesi; seçim → adım 3 açılır.
  3. **Tarih** — 14 günlük tarih seçimi; seçim → adım 4 açılır.
  4. **Saat** — müsait saatler, "Devam Et" aksiyonu (slot seçiliyse aktif).
- **Modal:** `BookingModal` (W3a) — "Devam Et" basılınca açılır.
- **Navigasyon:** hizmet veya usta değişince seçili slot sıfırlanır; Realtime — `appointment_slots` + `block_slots` kanalları.
- **Hata:** slot fetch hatası → `slotError` → SlotGrid içinde gösterilir + "Tekrar Dene" butonu.
- **Boş:** `isClosed = true` → SlotGrid "Bu gün için çalışma saati tanımlanmamış."; tüm slotlar dolu → "Bu günde müsait saat kalmadı. Başka bir gün seçin."
- **UI Metinleri:**
  - Adım numaraları: `1` `2` `3` `4`
  - Adım başlıkları: `"Hizmet Seç"` · `"Usta Seç"` · `"Tarih"` · `"Saat"`
  - "Usta Seç" özel seçenek: `"Fark Etmez"` + `"Uygun personele atanır"` (alt metin)
  - Tarih seçimi gün kısaltmaları: `"Paz"` `"Pzt"` `"Sal"` `"Çar"` `"Per"` `"Cum"` `"Cmt"`
  - Tarih seçimi ay kısaltmaları: `"Oca"` `"Şub"` `"Mar"` `"Nis"` `"May"` `"Haz"` `"Tem"` `"Ağu"` `"Eyl"` `"Eki"` `"Kas"` `"Ara"`
  - Buton (slot yok): `"Saat Seç"`
  - Buton (slot seçili): `"{HH:MM}'da Devam Et"`
  - ServiceSelector boş: `"Henüz hizmet tanımlanmamış."`
  - Slot dolu: `"Dolu"`
  - SlotGrid hata başlık: `"Müsaitlik bilgisi alınamadı."`
  - SlotGrid hata alt: `"Bağlantıyı kontrol edip tekrar deneyin."`
  - SlotGrid hata butonu: `"Tekrar Dene"`
  - SlotGrid kapalı / boş: `"Bu gün için çalışma saati tanımlanmamış."`
  - SlotGrid tam dolu: `"Bu günde müsait saat kalmadı. Başka bir gün seçin."`

#### W3a · `BookingModal` — Rezervasyon Onay Overlay (web)
- **Amaç:** seçilen randevuyu onaylatıp müşteri bilgilerini almak.
- **4 durum / adım:** `form` → `loading` → `success` / `error`.
- **Form:** Ad Soyad (zorunlu, min 2), Telefon (opsiyonel), Not (opsiyonel textarea); İptal + Onayla aksiyonları.
- **Navigasyon:** `success` → overlay kapanır, slot listesi yenilenir; `error` çakışma → overlay kapanır, kullanıcı yeni slot seçer; `error` diğer → "Tekrar Dene" butonu ile form'a dönüş.
- **Hata (409 çakışma):** "Bu saat az önce doldu. Lütfen başka saat seçin." + "Saat Seç" butonu.
- **Hata (çalışma saati dışı):** "Bu saat artık çalışma saatleri dışında." + sayfa yenileme önerisi.
- **Hata (diğer):** hata metni + "Tekrar Dene" butonu.
- **Başarı:** "Onaylandı" bilgisi, "Randevunuz alındı" başlığı, personel+hizmet+tarih özeti, SMS notu, "Yeni randevu" aksiyonu.
- **UI Metinleri:**
  - Modal başlık: `"Randevuyu Onayla"`
  - Alt başlık: `"{staffLabel} · {service.name} · {dateLabel}, {timeLabel}"`
  - Alan etiketleri: `"Ad Soyad"` · `"Telefon"` · `"Not (opsiyonel)"`
  - Placeholder ad: `"örn. Ahmet Yılmaz"` · Placeholder tel: `"0(5xx) xxx xx xx"` · Placeholder not: `"Saç uzunluğu, tercih, vs."`
  - Butonlar form: `"İptal"` · `"Randevuyu Onayla"`
  - Loading metin: `"Randevu oluşturuluyor..."`
  - Başarı bilgisi: `"Onaylandı"`
  - Başarı başlık: `"Randevunuz alındı"`
  - Başarı meta: `"{staff_name} · {service_name}"` + `"{tarih saat}"` + `"Onay SMS'i yolda."`
  - Başarı butonu: `"Yeni randevu"`
  - Hata bilgisi: `"Hata"`
  - Hata mesajı — çakışma: `"Bu saat az önce doldu. Lütfen listeden başka bir saat seçin."` — tetikleyici: HTTP 409 + `should_refetch_availability`
  - Hata mesajı — çalışma saati: `"Bu saat artık çalışma saatleri dışında. Sayfayı yenileyip güncel saatleri görün."` — tetikleyici: HTTP 409 + response içinde `"calisma saati"`
  - Hata mesajı — bağlantı: `"Bağlantı hatası. Lütfen tekrar deneyin."` — tetikleyici: fetch exception
  - Hata mesajı — diğer: `data.error ?? "Randevu oluşturulamadı."` — tetikleyici: HTTP !ok, non-409
  - Hata butonu — çakışma: `"Saat Seç"` (tek buton, overlay kapanır)
  - Hata butonları — diğer: `"Kapat"` + `"Tekrar Dene"` (form adımına döner)

#### W4 · `src/app/not-found.tsx` — 404
- **Amaç:** geçersiz slug veya kayıp sayfa durumunu karşılamak.
- **İçerik:** 404 bilgisi, sayfa bulunamadı mesajı, ana sayfaya dönüş aksiyonu, alt not.
- **Modals / Sheets:** yok.
- **Navigasyon:** "Ana Sayfaya Dön" → `/`.
- **UI Metinleri:**
  - Üst etiket: `"404 · SAYFA YOK"`
  - Büyük sayı: `"404"`
  - Başlık: `"Berber Bulunamadı"`
  - Açıklama: `"Aradığın berber profili artık mevcut değil ya da bağlantı yanlış yazılmış olabilir. Ana sayfaya dönüp tekrar deneyebilirsin."`
  - Buton: `"Ana Sayfaya Dön"`
  - Alt not: `"Berber · v1.0.0"`
