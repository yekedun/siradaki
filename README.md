# Sıradaki

**Production:** [siradaki.app](https://siradaki.app)

Berberler için randevu yönetim sistemi. Sahip, personel ve müşteri rollerine sahip çok kullanıcılı yapı; mobil uygulama ve web rezervasyon sayfasından oluşur.

## Yapı

```
apps/
  mobile/     React Native (Expo) — sahip ve personel uygulaması
  web/        Next.js — müşteri rezervasyon sayfası + admin paneli
packages/
  db/         Supabase tipleri ve migration yardımcıları
  shared/     Ortak yardımcı fonksiyonlar
supabase/
  functions/  Deno edge fonksiyonları (iş mantığı)
  migrations/ Veritabanı migration dosyaları
```

## Teknolojiler

- **Mobil:** React Native, Expo, Expo Router
- **Web:** Next.js 14 (App Router), Tailwind CSS
- **Backend:** Supabase (PostgreSQL + RLS + Edge Functions)
- **Auth:** Supabase Auth, Google OAuth
- **Monorepo:** pnpm workspaces, Turborepo
- **Dil:** TypeScript (tüm paketlerde)

## Özellikler

**Sahip (owner)**
- Randevu takvimi — günlük/haftalık agenda görünümü
- Ekip yönetimi — berber davet, komisyon yapılandırma
- Hizmet yönetimi — fiyat ve süre
- Kazanç raporları — günlük/haftalık/aylık
- Çalışma saati ve profil ayarları
- Ana ekran widget desteği

**Personel (staff)**
- Kişisel randevu listesi
- Randevu ekleme ve iptal
- Takvim bloklama (mola, kişisel, anlık)
- Kişisel rezervasyon linki

**Müşteri (web)**
- `siradaki.app/{slug}` — berbere özel rezervasyon sayfası
- `siradaki.app/{slug}/u/{berber}` — berbere özel kişisel link
- Hizmet, tarih ve saat seçimi
- SMS/WhatsApp ile bildirim

**Admin**
- `siradaki.app/admin` — dükkan onay paneli

## Edge Fonksiyonları

| Fonksiyon | Açıklama |
|---|---|
| `register-shop` | Yeni dükkan kaydı |
| `app-book-appointment` | Randevu oluşturma |
| `app-cancel-appointment` | Müşteri iptali |
| `staff-cancel-appointment` | Personel iptali |
| `create-manual-block` | Takvim bloklama |
| `invite-barber` | Berber davet token üretimi |
| `open-invite` | Token doğrulama |
| `accept-invite` | Daveti kabul ve hesap oluşturma |
| `widget-get-availability` | Widget için müsait saatler |
| `widget-book-appointment` | Widget'tan randevu |
| `create-widget-token` | Widget erişim token'ı |
| `daily-summary-push` | Günlük özet push bildirimi |
| `send-push` | Genel push bildirimi |
| `delete-account` | Hesap silme |

## Kurulum

```bash
# Bağımlılıkları kur
pnpm install

# Supabase'i başlat (Docker gerekli)
npx supabase start
npx supabase db reset

# Web uygulamasını başlat
pnpm --filter web dev

# Mobil uygulamayı başlat
pnpm --filter mobile start
```

### Ortam Değişkenleri

`apps/web/.env.local` ve `apps/mobile/.env.local` dosyalarını oluştur:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Testler

```bash
# Tüm paketlerde tip kontrolü
pnpm typecheck

# Lint
pnpm lint

# Web birim testleri (Vitest)
pnpm --filter web test
```

## Veritabanı

Migration'lar `supabase/migrations/` altında sıralıdır. Tüm tablolarda RLS aktiftir. Şema değişikliği için:

```bash
npx supabase db reset        # sıfırdan kur
npx supabase db diff         # yeni migration üret
```
