import {
  buildAvailabilityQuery,
  formatIstanbulSlotTime,
  mapAvailabilityResponse,
} from '../lib/appointment-availability';

describe('formatIstanbulSlotTime', () => {
  it('UTC timestamp Istanbul saatine çevrilir', () => {
    // 06:00 UTC = 09:00 Istanbul (UTC+3)
    expect(formatIstanbulSlotTime('2026-06-12T06:00:00.000Z')).toBe('09:00');
  });

  it('gün dönümü doğru çevrilir', () => {
    // 21:30 UTC = ertesi gün 00:30 Istanbul
    expect(formatIstanbulSlotTime('2026-06-12T21:30:00.000Z')).toBe('00:30');
  });
});

describe('mapAvailabilityResponse', () => {
  it('slots HH:MM + available olarak maplenir', () => {
    const result = mapAvailabilityResponse({
      closed: false,
      slots: [
        { starts_at: '2026-06-12T06:00:00.000Z', ends_at: '2026-06-12T06:30:00.000Z', available: true },
        { starts_at: '2026-06-12T06:30:00.000Z', ends_at: '2026-06-12T07:00:00.000Z', available: false },
      ],
    });
    expect(result).toEqual({
      closed: false,
      slots: [
        { time: '09:00', available: true },
        { time: '09:30', available: false },
      ],
    });
  });

  it('closed=true → boş kapalı gün', () => {
    expect(mapAvailabilityResponse({ closed: true, slots: [] })).toEqual({ closed: true, slots: [] });
  });

  it('available alanı boolean true değilse false sayılır', () => {
    const result = mapAvailabilityResponse({
      slots: [{ starts_at: '2026-06-12T06:00:00.000Z' }],
    });
    expect(result.slots[0].available).toBe(false);
  });

  it('bozuk slot satırları atlanır', () => {
    const result = mapAvailabilityResponse({
      slots: [
        null,
        { starts_at: 42, available: true },
        { starts_at: 'not-a-date', available: true },
        { starts_at: '2026-06-12T06:00:00.000Z', available: true },
      ],
    });
    expect(result.slots).toHaveLength(1);
    expect(result.slots[0].time).toBe('09:00');
  });

  it('payload obje değilse throw eder (fallback tetiklenir)', () => {
    expect(() => mapAvailabilityResponse(null)).toThrow();
    expect(() => mapAvailabilityResponse('oops')).toThrow();
  });

  it('slots dizisi yoksa throw eder', () => {
    expect(() => mapAvailabilityResponse({ closed: false })).toThrow();
  });
});

describe('buildAvailabilityQuery', () => {
  it('hizmet seçiliyken service_ids gönderilir', () => {
    const qs = new URLSearchParams(buildAvailabilityQuery({
      shopSlug: 'kral-berber',
      date: '2026-06-12',
      staffId: 'staff-1',
      serviceIds: ['svc-1', 'svc-2'],
    }));
    expect(qs.get('shop_slug')).toBe('kral-berber');
    expect(qs.get('date')).toBe('2026-06-12');
    expect(qs.get('staff_id')).toBe('staff-1');
    expect(qs.get('service_ids')).toBe('svc-1,svc-2');
    expect(qs.get('duration_min')).toBeNull();
    expect(qs.get('_t')).not.toBeNull(); // cache-bust her istekte var
  });

  it('hizmet seçilmemişken duration_min=30 fallback', () => {
    const qs = new URLSearchParams(buildAvailabilityQuery({
      shopSlug: 'kral-berber',
      date: '2026-06-12',
      staffId: null,
      serviceIds: [],
    }));
    expect(qs.get('staff_id')).toBe('any');
    expect(qs.get('duration_min')).toBe('30');
    expect(qs.get('service_ids')).toBeNull();
  });
});
