import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviceClient = {
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => serviceClient),
}));

import { approveShop, rejectShop, suspendShop, reactivateShop, assertAdmin } from './actions';

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
});
