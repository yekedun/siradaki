import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviceClient = {
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => serviceClient),
}));

import { approveShop, rejectShop, suspendShop, reactivateShop } from './actions';
import { assertAdmin } from '../lib/assert-admin';

function mockUpdate(resolveValue: { error: null | { message: string } } = { error: null }) {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(resolveValue),
  };
}

function mockSelect(resolveValue: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
  };
}

describe('assertAdmin', () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET_KEY = 'correct-secret';
  });

  it('doğru key ile geçer', () => {
    expect(() => assertAdmin('correct-secret')).not.toThrow();
  });

  it('yanlış key ile Yetkisiz atar', () => {
    expect(() => assertAdmin('wrong-key')).toThrow('Yetkisiz');
  });

  it('boş env var ile hata atar', () => {
    delete process.env.ADMIN_SECRET_KEY;
    expect(() => assertAdmin('anything')).toThrow('ADMIN_SECRET_KEY');
  });
});

describe('suspendShop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET_KEY = 'secret';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  });

  it('yanlış key ile Yetkisiz atar', async () => {
    await expect(suspendShop('shop-1', 'wrong')).rejects.toThrow('Yetkisiz');
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it('doğru key ile shops tablosunu günceller', async () => {
    serviceClient.from.mockReturnValue(mockUpdate());
    await suspendShop('shop-1', 'secret');
    expect(serviceClient.from).toHaveBeenCalledWith('shops');
  });

  it('DB hatası olunca exception fırlatır', async () => {
    serviceClient.from.mockReturnValue(mockUpdate({ error: { message: 'db error' } }));
    await expect(suspendShop('shop-1', 'secret')).rejects.toThrow('Durdurma başarısız');
  });
});

describe('reactivateShop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET_KEY = 'secret';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  });

  it('yanlış key ile Yetkisiz atar', async () => {
    await expect(reactivateShop('shop-1', 'wrong')).rejects.toThrow('Yetkisiz');
  });

  it('doğru key ile shops tablosunu günceller', async () => {
    serviceClient.from.mockReturnValue(mockUpdate());
    await reactivateShop('shop-1', 'secret');
    expect(serviceClient.from).toHaveBeenCalledWith('shops');
  });
});

describe('approveShop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET_KEY = 'secret';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  });

  it('yanlış key ile Yetkisiz atar', async () => {
    await expect(approveShop('shop-1', 'wrong')).rejects.toThrow('Yetkisiz');
  });

  it('zaten aktif dükkan için erken döner', async () => {
    serviceClient.from.mockReturnValue(mockSelect({ data: { status: 'active' }, error: null }));
    const result = await approveShop('shop-1', 'secret');
    expect(result).toEqual({ error: 'Bu dükkan zaten aktif.' });
  });
});

describe('rejectShop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET_KEY = 'secret';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  });

  it('yanlış key ile Yetkisiz atar', async () => {
    await expect(rejectShop('shop-1', 'wrong')).rejects.toThrow('Yetkisiz');
  });

  it('zaten reddedilmiş dükkan için erken döner', async () => {
    serviceClient.from.mockReturnValue(mockSelect({ data: { status: 'rejected' }, error: null }));
    const result = await rejectShop('shop-1', 'secret');
    expect(result).toEqual({ error: 'Bu dükkan zaten reddedilmiş.' });
    expect(serviceClient.from).toHaveBeenCalledOnce();
  });

  it('bekleyen dükkanı reddeder ve shops tablosunu günceller', async () => {
    serviceClient.from
      .mockReturnValueOnce(mockSelect({ data: { status: 'pending' }, error: null }))
      .mockReturnValueOnce(mockUpdate())
      .mockReturnValueOnce(mockSelect({ data: null, error: null })); // sendOwnerPush: no owner → returns early
    await rejectShop('shop-1', 'secret');
    expect(serviceClient.from).toHaveBeenCalledWith('shops');
  });
});

describe('getShops', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET_KEY = 'secret';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  });

  it('yanlış key ile Yetkisiz atar', async () => {
    const { getShops } = await import('./actions');
    await expect(getShops('wrong', 0, 20)).rejects.toThrow('Yetkisiz');
  });

  it('owner bilgisini staff tablosundan phone dahil çeker', async () => {
    const shopRow = {
      id: 'shop-1',
      name: 'Test Berber',
      display_name: 'Test Berber',
      slug: 'test-berber',
      status: 'pending',
      created_at: '2026-01-01T00:00:00Z',
      owner_user_id: 'user-1',
      address: 'İstanbul',
      phone: '05001112233',
      is_listed: true,
    };
    const staffRow = {
      shop_id: 'shop-1',
      name: 'Ali Veli',
      email: 'ali@example.com',
      phone: '05551234567',
    };

    serviceClient.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [shopRow], count: 1, error: null }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [staffRow], error: null }),
      });

    const { getShops } = await import('./actions');
    const result = await getShops('secret', 0, 20);

    expect(result.total).toBe(1);
    expect(result.data[0]!.owner).toEqual({
      name: 'Ali Veli',
      email: 'ali@example.com',
      phone: '05551234567',
    });
    expect(result.data[0]!.address).toBe('İstanbul');
    expect(result.data[0]!.phone).toBe('05001112233');
  });

  it('owner yoksa null döner', async () => {
    const shopRow = {
      id: 'shop-2',
      name: null,
      display_name: 'Boş Berber',
      slug: 'bos-berber',
      status: 'pending',
      created_at: '2026-01-01T00:00:00Z',
      owner_user_id: 'user-2',
      address: null,
      phone: null,
      is_listed: false,
    };

    serviceClient.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [shopRow], count: 1, error: null }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

    const { getShops } = await import('./actions');
    const result = await getShops('secret', 0, 20);

    expect(result.data[0]!.owner).toBeNull();
  });
});
