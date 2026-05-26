# Berber Randevu — Core Flow Design

Date: 2026-05-26  
Status: Approved

---

## Kapsam

Sistemin uçtan uca çalışır hale gelmesi için gereken 5 akış ve yan özellikler. Deploy öncesi tamamlanması gereken minimum set.

---

## Aktörler

| Aktör | Platform | Tanım |
|-------|----------|-------|
| **Admin (Emre)** | Web `/admin` | Sistemi işleten kişi. Sahip başvurularını onaylar. |
| **Dükkan Sahibi** | Mobil (owner tab) | Dükkan açmış kişi. Aynı zamanda berber — kendisine de randevu alınabilir. |
| **Berber** | Mobil (barber tab) | Sahibin davet ettiği çalışan. |
| **Müşteri** | Web | Hesap açmaz. Ad + telefon ile randevu alır. |

---

## Akış 1 — Dükkan Sahibi Kaydı (Admin Onaylı)

### Sahip tarafı
1. Uygulamayı indirir, "Google ile Giriş Yap" tuşuna basar.
2. Google OAuth tamamlanır.
3. **İlk giriş ekranı** açılır: telefon numarası + dükkan adı.
4. Slug otomatik üretilir: dükkan adından Türkçe karakterler dönüştürülür, küçük harf + tire → `neco-kuafor` gibi. Kullanıcıya gösterilmez.
5. Kaydet → `shop_status = 'pending'` olarak kaydedilir.
6. Sahip "Başvurun alındı, onay bekleniyor" ekranını görür. Uygulamaya giremez.
7. Onay gelince push bildirimi alır → uygulamaya girer.

### Admin tarafı (siradaki.app/admin)
- Yeni başvuru geldiğinde: push bildirimi + email (emreyek29@gmail.com).
- `/admin` sayfasında liste: dükkan adı, sahip adı, Google email, telefon, başvuru tarihi.
- Her satırda "Onayla" / "Reddet" butonu.
- Onay: `shop_status = 'active'`, sahibe push gönderilir.
- Red: `shop_status = 'rejected'`, sahibe push + basit red mesajı.

### Teknik notlar
- `shops` tablosuna `status` kolonu: `pending | active | rejected`.
- Admin paneli: Next.js route `/admin` — Supabase service role key ile direkt sorgu. Basit auth: hardcoded admin email kontrolü (Emre'nin Google emaili).
- Push için mevcut `send-push` edge fn kullanılır.

---

## Akış 2 — Berber Davet (WhatsApp Link)

1. Sahip: Ekip → "Berber Davet Et" tuşu.
2. Sistem: tek kullanımlık davet token'ı üretir (`invite_tokens` tablosu, 48 saat geçerli).
3. Link: `siradaki.app/invite/{token}` — sahip bunu WhatsApp'tan berbere atar.
4. Berber linke tıklar → **uygulama içinde** "Google ile Giriş Yap" ekranı (deep link / universal link — tarayıcıya yönlendirme yok).
5. Telefon no ekranı → kaydet.
6. `staff` tablosuna eklenir, `shop_id` token'dan alınır.
7. Mobil uygulamayı açtığında berber akışına yönlendirilir.

### Notlar
- Berber davet linki üzerinden geldiği için admin onayı **gerekmez**.
- Token bir kez kullanılır, süresi dolarsa "Link geçersiz" mesajı.
- Android'de `Alert.prompt` yok — davet ekranı modal input olarak yazılacak.

---

## Akış 3 — Berber Günlük Kullanım

- Oturum persist: `expo-secure-store` ile token saklanır, kullanıcı çıkış yapmadıkça sona ermez.
- Berber uygulaması açıldığında direkt agenda ekranı.

### Saat Bloğu — Yeni Özellikler
- **Tüm günü kapat**: Blok ekle ekranında "Bugünü Tamamen Kapat" toggle'ı. Mevcut randevular etkilenmez, sadece yeni slot açılmaz.
- **Hazır süreler**: 30 dk / 1 sa / 2 sa / Özel — Özel seçilince manuel süre girişi açılır.
- Bu özellikler hem berber hem sahip için geçerli.

---

## Akış 4 — Müşteri Web Randevusu + WhatsApp Bildirim

### Mevcut akış (değişmez)
Hizmet → Berber → Tarih → Saat → Ad + Telefon → Onay

### Yeni: Onay Ekranı Değişikliği
Randevu onaylandıktan sonra modal içeriği:

```
✅ Randevunuz Oluşturuldu!

[Randevu detayları]
📅 Tarih | ⏰ Saat | ✂️ Hizmet | 👤 Berber

[Tamam]
[💬 Berberi WhatsApp ile Bilgilendir]
```

"Berberi Bilgilendir" tıklandığında:
- `whatsapp://send?phone=90{berber_telefon}&text={mesaj}` şeması açılır.
- Mesaj örneği: `"Merhaba {berber_adı}, {tarih} {saat} için {hizmet} randevusu aldım. Bilginize 🙏"`
- Buton opsiyonel — müşteri istemezse kullanmaz.
- Bu sayede berber telefon numarası doğrulanmış olur (sahip davet ederken telefon girilmişti).

---

## Akış 5 — Sahip: Ekip Yönetimi

### Berber Kartı Tıklama (değişiklik)
**Eskisi**: Karta tıkla → "Pasif yap?" AlertDialog açılır  
**Yenisi**: Karta tıkla → Düzenleme bottom sheet/ekranı açılır

Düzenleme ekranı içeriği:
- Ad (düzenlenebilir)
- Telefon (düzenlenebilir)
- Sunduğu hizmetler (çoklu seçim)
- Çalışma saatleri (başlangıç / bitiş)
- **En altta**: "Aktif / Pasif" toggle — varsayılan aktif, değiştirmek için bilinçli bir aksiyon gerekir

### Sahip Aynı Zamanda Berber
- Sahip kendi profili ekip listesinde görünür.
- Müşteri web'den sahibi de seçebilir — ama "Sahip" veya "Dükkan Sahibi" etiketi gösterilmez, normal berber gibi görünür.
- Sahip her zaman berber listesinin **ilk sırasında** gösterilir (müşteri web + ekip listesi).
- Sahibin kendi randevuları berber akışında da görünür.

---

## Deploy Kritik Yolu

Sistemin kullanılabilir hale gelmesi için minimum:

1. `shop_status` pending/active/rejected → DB migration
2. Admin onay paneli (`/admin` route)
3. Push + email: yeni sahip başvurusu bildirimi
4. Google OAuth konfigürasyonu (Supabase + mobil)
5. Telefon no koleksiyonu ekranı (ilk giriş)
6. Davet token sistemi (invite_tokens tablosu + `/invite/[token]` route)
7. WhatsApp "Berberi Bilgilendir" butonu
8. Saat bloğu: tüm gün + hazır süreler
9. Ekip düzenleme ekranı (pasif yap → düzenle)
10. Oturum persist (expo-secure-store)

---

## Kapsam Dışı (şimdilik)

- SMS OTP / WhatsApp API (ücretli)
- Müşteri hesabı / login
- Multi-shop (birden fazla dükkan) frontend
- Analytics / Sentry
- Store görselleri
