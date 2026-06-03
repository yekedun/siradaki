// @vitest-environment node

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { middleware } from './middleware';

const supabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => supabase),
}));

function request(pathname: string) {
  return new NextRequest(new URL(pathname, 'https://siradaki.app'));
}

function staffRole(role: 'admin' | 'staff' | null) {
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

describe('middleware admin protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('redirects anonymous admin visitors to login with redirect target', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const response = await middleware(request('/admin'));

    expect(response.headers.get('location')).toBe('https://siradaki.app/giris?redirect=%2Fadmin');
  });

  it('redirects authenticated non-admin staff away from admin', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    supabase.from.mockReturnValue(staffRole('staff'));

    const response = await middleware(request('/admin'));

    expect(response.headers.get('location')).toBe('https://siradaki.app/');
  });

  it('allows authenticated admin staff to continue to admin', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    supabase.from.mockReturnValue(staffRole('admin'));

    const response = await middleware(request('/admin'));

    expect(response.headers.get('location')).toBeNull();
  });
});
