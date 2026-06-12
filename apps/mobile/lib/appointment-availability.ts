/**
 * AddAppointmentModal için sunucu müsaitliği.
 *
 * Saat grid'i artık yalnızca çalışma saatlerinden değil, widget-get-availability
 * edge function'ından geliyor — randevular, bloklar ve staff_schedules dahil tek
 * doğruluk kaynağı. (get_occupied_ranges RPC'si client'lardan REVOKE edildiği
 * için doğrudan DB sorgusu yapılamaz; edge fn zorunlu.)
 */

export interface AppointmentTimeSlot {
  time: string;       // "HH:MM" — Europe/Istanbul
  available: boolean;
}

export interface AppointmentDayAvailability {
  closed: boolean;
  slots: AppointmentTimeSlot[];
}

const ISTANBUL_TIME_FORMAT = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'Europe/Istanbul',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatIstanbulSlotTime(isoTimestamp: string): string {
  return ISTANBUL_TIME_FORMAT.format(new Date(isoTimestamp));
}

/**
 * widget-get-availability yanıtını modal'ın saat grid formatına çevirir.
 * Beklenmedik payload'larda exception yerine boş/kapalı sonuç döndürmez —
 * throw eder ki çağıran fallback'e (yerel slot üretimi) düşebilsin.
 */
export function mapAvailabilityResponse(payload: unknown): AppointmentDayAvailability {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Geçersiz müsaitlik yanıtı');
  }
  const body = payload as { closed?: unknown; slots?: unknown };
  if (body.closed === true) {
    return { closed: true, slots: [] };
  }
  if (!Array.isArray(body.slots)) {
    throw new Error('Geçersiz müsaitlik yanıtı: slots yok');
  }

  const slots: AppointmentTimeSlot[] = [];
  for (const raw of body.slots) {
    if (typeof raw !== 'object' || raw === null) continue;
    const slot = raw as { starts_at?: unknown; available?: unknown };
    if (typeof slot.starts_at !== 'string') continue;
    const startMs = Date.parse(slot.starts_at);
    if (Number.isNaN(startMs)) continue;
    slots.push({
      time: formatIstanbulSlotTime(slot.starts_at),
      available: slot.available === true,
    });
  }

  return { closed: false, slots };
}

export interface AvailabilityQueryParams {
  shopSlug: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** Belirli personel UUID'si; seçilmemişse "any" */
  staffId: string | null;
  /** Seçili hizmet UUID'leri; boşsa duration_min=30 fallback'i kullanılır */
  serviceIds: string[];
}

export function buildAvailabilityQuery(params: AvailabilityQueryParams): string {
  const qs = new URLSearchParams({
    shop_slug: params.shopSlug,
    date: params.date,
    staff_id: params.staffId ?? 'any',
  });
  if (params.serviceIds.length > 0) {
    qs.set('service_ids', params.serviceIds.join(','));
  } else {
    // Hizmet henüz seçilmemişken grid'i baseline 30 dk granülerlikte göster.
    qs.set('duration_min', '30');
  }
  // Edge fn yanıtı Cache-Control: max-age=30 ile dönüyor; modal her açılışta
  // taze veri görmeli — cache-bust parametresi bayat yanıtı engeller.
  qs.set('_t', String(Date.now()));
  return qs.toString();
}

const FN_BASE = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;

export async function fetchAppointmentDayAvailability(
  params: AvailabilityQueryParams,
  signal?: AbortSignal,
): Promise<AppointmentDayAvailability> {
  const res = await fetch(
    `${FN_BASE}/widget-get-availability?${buildAvailabilityQuery(params)}`,
    { signal },
  );
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = typeof (body as { error?: unknown } | null)?.error === 'string'
      ? (body as { error: string }).error
      : 'Müsaitlik bilgisi alınamadı';
    throw new Error(message);
  }
  return mapAvailabilityResponse(body);
}
