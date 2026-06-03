import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviceClient = {
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => serviceClient),
}));

import { getMetrics } from './actions';

describe('getMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET_KEY = 'secret';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  });

  it('yanlış key ile Yetkisiz atar', async () => {
    await expect(getMetrics('wrong')).rejects.toThrow('Yetkisiz');
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it('doğru key ile metrics objesi döner', async () => {
    // First 4 queries: .select() returns directly (count only)
    const makeCountQuery = (count: number) => ({
      select: vi.fn().mockResolvedValue({ count, data: null, error: null }),
    });

    // Queries 2 & 3 with .eq() chaining
    const makeCountWithEq = (count: number) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count, data: null, error: null }),
    });

    // Last 2 queries: .select().gte() returns data
    const makeDataQuery = (count: number, data: unknown[] = []) => ({
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count, data, error: null }),
    });

    serviceClient.from
      .mockReturnValueOnce(makeCountQuery(5))        // totalShops
      .mockReturnValueOnce(makeCountWithEq(3))       // activeShops with eq
      .mockReturnValueOnce(makeCountWithEq(1))       // pendingShops with eq
      .mockReturnValueOnce(makeCountQuery(10))       // totalUsers
      .mockReturnValueOnce(makeDataQuery(0, []))     // dailyShops
      .mockReturnValueOnce(makeDataQuery(0, []));    // dailyAppointments

    const result = await getMetrics('secret');

    expect(result.totalShops).toBe(5);
    expect(result.activeShops).toBe(3);
    expect(result.pendingShops).toBe(1);
    expect(result.totalUsers).toBe(10);
    expect(result.dailyStats).toHaveLength(30);
    expect(result.dailyStats[0]).toHaveProperty('date');
    expect(result.dailyStats[0]).toHaveProperty('shops');
    expect(result.dailyStats[0]).toHaveProperty('appointments');
  });

  it('dailyStats 30 günlük dizidir', async () => {
    const makeCountQuery = (count: number) => ({
      select: vi.fn().mockResolvedValue({ count, data: null, error: null }),
    });

    const makeCountWithEq = (count: number) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count, data: null, error: null }),
    });

    const makeDataQuery = (count: number, data: unknown[] = []) => ({
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count, data, error: null }),
    });

    serviceClient.from
      .mockReturnValueOnce(makeCountQuery(0))
      .mockReturnValueOnce(makeCountWithEq(0))
      .mockReturnValueOnce(makeCountWithEq(0))
      .mockReturnValueOnce(makeCountQuery(0))
      .mockReturnValueOnce(makeDataQuery(0, []))
      .mockReturnValueOnce(makeDataQuery(0, []));

    const result = await getMetrics('secret');
    expect(result.dailyStats).toHaveLength(30);
  });

  it('günlük veriler doğru tarih formatıyla bulunur', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.toISOString().slice(0, 10);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const makeCountQuery = (count: number) => ({
      select: vi.fn().mockResolvedValue({ count, data: null, error: null }),
    });

    const makeCountWithEq = (count: number) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count, data: null, error: null }),
    });

    const makeDataQuery = (count: number, data: unknown[] = []) => ({
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count, data, error: null }),
    });

    serviceClient.from
      .mockReturnValueOnce(makeCountQuery(0))           // totalShops
      .mockReturnValueOnce(makeCountWithEq(0))          // activeShops
      .mockReturnValueOnce(makeCountWithEq(0))          // pendingShops
      .mockReturnValueOnce(makeCountQuery(0))           // totalUsers
      .mockReturnValueOnce(makeDataQuery(2, [
        { created_at: `${todayStr}T10:00:00Z` },
        { created_at: `${todayStr}T14:30:00Z` },
      ]))                                                // dailyShops
      .mockReturnValueOnce(makeDataQuery(1, [
        { created_at: `${yesterdayStr}T09:00:00Z` },
      ]));                                               // dailyAppointments

    const result = await getMetrics('secret');

    const todayEntry = result.dailyStats.find(s => s.date === todayStr);
    const yesterdayEntry = result.dailyStats.find(s => s.date === yesterdayStr);

    expect(todayEntry?.shops).toBe(2);
    expect(yesterdayEntry?.appointments).toBe(1);
  });

  it('Supabase sorguları paralel çalışır', async () => {
    const makeCountQuery = (count: number) => ({
      select: vi.fn().mockResolvedValue({ count, data: null, error: null }),
    });

    const makeCountWithEq = (count: number) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count, data: null, error: null }),
    });

    const makeDataQuery = (count: number, data: unknown[] = []) => ({
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count, data, error: null }),
    });

    serviceClient.from
      .mockReturnValueOnce(makeCountQuery(5))
      .mockReturnValueOnce(makeCountWithEq(3))
      .mockReturnValueOnce(makeCountWithEq(1))
      .mockReturnValueOnce(makeCountQuery(10))
      .mockReturnValueOnce(makeDataQuery(0, []))
      .mockReturnValueOnce(makeDataQuery(0, []));

    await getMetrics('secret');

    // 6 tablo sorgusu yapılmalı: shops, shops (status=active), shops (status=pending), staff, shops (created_at), appointments (created_at)
    expect(serviceClient.from).toHaveBeenCalledTimes(6);
  });

  it('boş veri ile null veya empty dizi durumunu işler', async () => {
    const makeCountQuery = (count: number) => ({
      select: vi.fn().mockResolvedValue({ count, data: null, error: null }),
    });

    const makeCountWithEq = (count: number) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count, data: null, error: null }),
    });

    const makeDataQuery = (count: number, data: unknown[] | null = null) => ({
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count, data, error: null }),
    });

    serviceClient.from
      .mockReturnValueOnce(makeCountQuery(0))    // totalShops
      .mockReturnValueOnce(makeCountWithEq(0))   // activeShops
      .mockReturnValueOnce(makeCountWithEq(0))   // pendingShops
      .mockReturnValueOnce(makeCountQuery(0))    // totalUsers
      .mockReturnValueOnce(makeDataQuery(0, null)) // dailyShops - null veri
      .mockReturnValueOnce(makeDataQuery(0, null)); // dailyAppointments - null veri

    const result = await getMetrics('secret');

    expect(result.totalShops).toBe(0);
    expect(result.activeShops).toBe(0);
    expect(result.pendingShops).toBe(0);
    expect(result.totalUsers).toBe(0);
    expect(result.dailyStats).toHaveLength(30);
    expect(result.dailyStats.every(s => s.shops === 0 && s.appointments === 0)).toBe(true);
  });

  it('null count değerini 0 olarak işler', async () => {
    const makeCountQuery = (count: number | null) => ({
      select: vi.fn().mockResolvedValue({ count, data: null, error: null }),
    });

    const makeCountWithEq = (count: number | null) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count, data: null, error: null }),
    });

    const makeDataQuery = (count: number, data: unknown[] = []) => ({
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count, data, error: null }),
    });

    serviceClient.from
      .mockReturnValueOnce(makeCountQuery(null))    // totalShops null
      .mockReturnValueOnce(makeCountWithEq(null))   // activeShops null
      .mockReturnValueOnce(makeCountWithEq(null))   // pendingShops null
      .mockReturnValueOnce(makeCountQuery(null))    // totalUsers null
      .mockReturnValueOnce(makeDataQuery(0, []))    // dailyShops
      .mockReturnValueOnce(makeDataQuery(0, []));   // dailyAppointments

    const result = await getMetrics('secret');

    expect(result.totalShops).toBe(0);
    expect(result.activeShops).toBe(0);
    expect(result.pendingShops).toBe(0);
    expect(result.totalUsers).toBe(0);
  });
});
