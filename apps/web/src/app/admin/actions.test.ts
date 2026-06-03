import { beforeEach, describe, expect, it, vi } from 'vitest';

const userClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

const serviceClient = {
  from: vi.fn(),
};

vi.mock('../../lib/supabase/server', () => ({
  createClient: vi.fn(() => userClient),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => serviceClient),
}));

import { approveShop } from './dukkanlar/actions';

function userStaffRole(role: 'admin' | 'staff' | null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: role ? { role } : null,
      error: null,
    }),
  };
}

function serviceUpdateResult() {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  };
}

function serviceShopLookupResult() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { owner_user_id: null }, error: null }),
  };
}

describe('admin actions authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET_KEY = 'secret';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  });

  it('rejects a non-admin staff user before using the service role update', async () => {
    userClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    userClient.from.mockReturnValue(userStaffRole('staff'));
    serviceClient.from
      .mockReturnValueOnce(serviceUpdateResult())
      .mockReturnValueOnce(serviceShopLookupResult());

    await expect(approveShop('shop-1', 'secret')).rejects.toThrow('Yetkisiz');

    expect(serviceClient.from).not.toHaveBeenCalled();
  });
});
