# Plan C — Ajanda: Randevu Eklerken Berber Seçimi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dükkan sahibi ajanda ekranından randevu eklerken hangi berbere atanacağını seçebilmeli; seçim `app-book-appointment` edge function'ına `staff_id` olarak iletilmeli.

**Architecture:** `AddAppointmentModal`'a `staffList` ve `initialStaffId` prop'ları ekle. Modal içinde servis seçiminin üstüne berber picker (TouchableOpacity satırları) yerleştir. Agenda ekranında modal çağrısına `barberList` + varsayılan seçim ilet.

**Tech Stack:** React Native (TypeScript)

---

## Arka Plan

Mevcut `AddAppointmentModal`:
- `onSave` callback'e `{ customerName, customerPhone, serviceId, date, time }` döndürüyor
- `staff_id` yok → agenda.tsx `staff_id: null` gönderiyor → booking engine tüm personelde çakışma kontrolü yapar veya hata verir

`app-book-appointment` edge function signature:
```ts
interface BookRequest {
  shop_slug: string;
  service_id: string;
  staff_id?: string | null;
  starts_at: string;
  customer_name: string;
  customer_phone?: string | null;
}
```

`staff_id` null geçilebilir (sistem uygun personelee atar) ama dükkan sahibi seçmeyi bekliyor.

---

## Dosya Haritası

- **Modify:** `apps/mobile/components/AddAppointmentModal.tsx`
- **Modify:** `apps/mobile/app/(owner)/agenda.tsx`

---

### Task 1: AddAppointmentModal — staffList Prop ve Seçici Ekle

**Files:**
- Modify: `apps/mobile/components/AddAppointmentModal.tsx`

- [ ] **Step 1: Prop interface'lerini güncelle**

`AddAppointmentModalProps`'a ekle:
```ts
export interface StaffOption {
  id: string;
  name: string;
}

export interface AddAppointmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    customerName: string;
    customerPhone: string;
    serviceId: string;
    staffId: string | null;
    date: string;
    time: string;
  }) => void;
  services?: ServiceOption[];
  staffList?: StaffOption[];        // YENİ
  initialStaffId?: string | null;   // YENİ
}
```

- [ ] **Step 2: state ekle**

`AddAppointmentModal` fonksiyon içinde, `services` ve `svc` state'lerinin yanına:
```ts
const [selectedStaffId, setSelectedStaffId] = useState<string | null>(initialStaffId ?? null);
```

- [ ] **Step 3: Berber seçici UI — servisten hemen ÖNCE ekle**

"Hizmet" SectionLabel'dan önce, eğer `staffList` prop'u var ve 1'den fazla eleman varsa, berber seçici göster:

```tsx
{staffList && staffList.length > 0 && (
  <>
    <Text style={styles.sectionLabel}>Berber</Text>
    <View style={styles.serviceList}>
      {staffList.map(s => {
        const sel = selectedStaffId === s.id;
        return (
          <TouchableOpacity
            key={s.id}
            onPress={() => setSelectedStaffId(s.id)}
            activeOpacity={0.8}
            style={[styles.serviceRow, sel ? styles.serviceRowActive : styles.serviceRowInactive]}
          >
            <Text style={[styles.serviceLabel, sel && styles.serviceLabelActive]}>
              {s.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </>
)}
```

`serviceList`, `serviceRow`, `serviceRowActive`, `serviceRowInactive`, `serviceLabel`, `serviceLabelActive` stilleri zaten mevcut — yeniden kullan.

- [ ] **Step 4: canSave'i güncelle**

Eğer `staffList` verilmişse ve seçim yapılmamışsa kaydetme izni verme:
```ts
const canSave = name.trim().length >= 2 && !!slot &&
  (!(staffList && staffList.length > 0) || !!selectedStaffId);
```

- [ ] **Step 5: handleSave'de staffId'yi ilet**

```ts
function handleSave() {
  if (!canSave) return;
  onSave({
    customerName: name.trim(),
    customerPhone: phone,
    serviceId: svc,
    staffId: selectedStaffId,
    date: selDate.toISOString().slice(0, 10),
    time: slot,
  });
  onClose();
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/components/AddAppointmentModal.tsx
git commit -m "feat(mobile): AddAppointmentModal — add staff picker (staffList + initialStaffId props)"
```

---

### Task 2: Agenda Ekranı — Modal'a staffList İlet + onSave'de staffId Kullan

**Files:**
- Modify: `apps/mobile/app/(owner)/agenda.tsx`

- [ ] **Step 1: AddAppointmentModal import'una StaffOption ekle**

```ts
import { AddAppointmentModal, ServiceOption, StaffOption } from '../../components/AddAppointmentModal';
```

- [ ] **Step 2: barberList'i StaffOption formatına dönüştür**

`barberList` zaten `{ id: string; name: string }[]` — bu `StaffOption` ile aynı shape, doğrudan geç.

- [ ] **Step 3: AddAppointmentModal render'ını güncelle**

Mevcut `<AddAppointmentModal>` JSX'ini şununla değiştir:

```tsx
<AddAppointmentModal
  visible={showAdd}
  onClose={() => setShowAdd(false)}
  services={services}
  staffList={barberList}
  onSave={async (data) => {
    if (!shopSlug) return;
    try {
      const { error } = await supabase.functions.invoke('app-book-appointment', {
        body: {
          shop_slug: shopSlug,
          service_id: data.serviceId,
          staff_id: data.staffId,
          starts_at: `${data.date}T${data.time}:00`,
          customer_name: data.customerName,
          customer_phone: data.customerPhone || null,
        },
      });
      if (error) throw error;
      setShowAdd(false);
      loadAgenda();
    } catch {
      Alert.alert('Hata', 'Randevu eklenemedi. Seçilen saat dolu olabilir.');
    }
  }}
/>
```

`data.staffId` artık modaldan geliyor (null değil).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/(owner)/agenda.tsx
git commit -m "feat(mobile): agenda — pass barberList to AddAppointmentModal, use staffId from selection"
```

---

### Task 3: Staff Ekranı (app/index.tsx) — onSave Güncelle

**Files:**
- Modify: `apps/mobile/app/(app)/index.tsx`

Staff ekranında modal giriş `staffId` prop'u olmadan açılıyor; onSave imzası da değişti.

- [ ] **Step 1: onSave imzasını güncelle**

`index.tsx`'teki `onSave` callback'ini güncelle (artık `data.staffId` var):

```ts
onSave={async (data) => {
  if (!staffShopSlug || !staffId) {
    Alert.alert('Hata', 'Oturum bilgisi eksik.');
    return;
  }
  try {
    const { error } = await supabase.functions.invoke('app-book-appointment', {
      body: {
        shop_slug: staffShopSlug,
        service_id: data.serviceId,
        staff_id: data.staffId ?? staffId,
        starts_at: `${data.date}T${data.time}:00`,
        customer_name: data.customerName,
        customer_phone: data.customerPhone || null,
      },
    });
    if (error) throw error;
    setShowAdd(false);
    fetchAppointments();
  } catch {
    Alert.alert('Hata', 'Randevu eklenemedi. Seçilen saat dolu olabilir.');
  }
}}
```

`data.staffId ?? staffId` → staff kendi adına ekliyorsa picker yoktur, kendi ID'si kullanılır.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(app)/index.tsx
git commit -m "fix(mobile): staff/index — update onSave signature for new staffId field"
```

---

### Task 4: Push + Doğrulama

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Cihazda test**

`test-berber@berber.dev` ile:
- [ ] Ajanda → "+ Randevu Ekle" → Modal açılıyor
- [ ] Modal'da "Berber" bölümü görünüyor, dükkan personelleri listeleniyor
- [ ] Berber seçilmeden "Kaydet" butonuna basılamıyor (disabled)
- [ ] Berber + hizmet + tarih + saat seçilip kaydedilince → ajandada ilgili berberin kolonunda randevu görünüyor
