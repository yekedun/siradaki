# Web Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-featured web dashboard for shop owners — `/giris` (login), `/kayit` (register), and `/dashboard/*` pages that bring all mobile owner features to the web.

**Architecture:** Cookie-based SSR-compatible auth via `@supabase/ssr`; client-agnostic query helpers in `packages/db` (takes a Supabase client as a parameter, shared by both mobile and web); `slugify`/`DEFAULT_WORKING_HOURS` moved to `packages/shared`; Next.js App Router `/dashboard` route group; left sidebar (desktop) + bottom nav (mobile-responsive). The `ensure_owner_staff` DB trigger automatically adds the owner as a staff member when a shop is created — the setup banner is aware of this, so there is no "add staff" step.

**Tech Stack:** Next.js 15 App Router, `@supabase/ssr ^0.10.3`, TypeScript strict, Tailwind CSS, Lucide React

---

## Current State (Before Applying This Plan)

The following were started in a previous session and **not verified**:
- `apps/web/src/lib/supabase/browser.ts` — created
- `apps/web/src/lib/supabase/server.ts` — created
- `apps/web/src/middleware.ts` — created
- `apps/web/tsconfig.json` — `@berber/db` path added
- `apps/web/next.config.js` — `@berber/db` transpile added
- `packages/db/src/index.ts` — created
- `apps/web/src/lib/supabase.ts` — converted to re-export
- `apps/web/src/app/[slug]/page.tsx` — server client migration started (blank line bug present)

**Task 0 fixes all of these and ensures `tsc` exits clean.**

---

## File Map

```
packages/shared/src/
  slug-utils.ts           NEW     — slugify (moved from mobile)
  working-hours.ts        NEW     — DEFAULT_WORKING_HOURS
  index.ts                MODIFY  — add new exports

packages/db/src/
  index.ts                MODIFY  — add query exports
  queries/
    shop.ts               NEW     — getShopByOwner, updateShop
    services.ts           NEW     — getServices, upsertService, toggleService, deleteService
    staff.ts              NEW     — getStaff, updateStaff, deactivateStaff
    appointments.ts       NEW     — getAppointments, updateAppointmentStatus
    earnings.ts           NEW     — getEarningsReport

apps/web/src/
  middleware.ts           VERIFY  (existing)
  lib/supabase/
    browser.ts            VERIFY  (existing)
    server.ts             VERIFY  (existing)
  app/
    giris/page.tsx        NEW     — login (client component)
    kayit/page.tsx        NEW     — register + slug preview (client component)
    dashboard/
      layout.tsx          NEW     — sidebar layout (server wrapper)
      page.tsx            NEW     — overview KPIs (server + client islands)
      ajanda/page.tsx     NEW     — timeline (client, realtime)
      hizmetler/page.tsx  NEW     — service management (client)
      ekip/page.tsx       NEW     — team management (client)
      gelir/page.tsx      NEW     — earnings report (server)
      ayarlar/page.tsx    NEW     — settings (client)
  components/dashboard/
    Sidebar.tsx           NEW
    MobileNav.tsx         NEW
    SetupBanner.tsx       NEW
```

---

## Task 0: Fix and Verify Auth Infrastructure

**Files:**
- Modify: `apps/web/src/app/[slug]/page.tsx`
- Modify: `apps/web/src/app/[slug]/u/[barberSlug]/page.tsx`
- Verify: `apps/web/src/lib/supabase/browser.ts`
- Verify: `apps/web/src/lib/supabase/server.ts`
- Verify: `apps/web/src/middleware.ts`

- [ ] **Step 1: Fix the blank line in `[slug]/page.tsx`**

```typescript
// Current broken section:
//     supabase
//       .from('services')
//
//       .select(...)
// Fixed:
//     supabase
//       .from('services')
//       .select(...)
```

- [ ] **Step 2: Migrate `supabase` import in `[slug]/u/[barberSlug]/page.tsx` to server client**

```typescript
// OLD:
import { supabase } from '../../../../lib/supabase';
// NEW:
import { createClient } from '../../../../lib/supabase/server';
// Inside each function:
// const supabase = await createClient();
```

- [ ] **Step 3: Run tsc, verify zero errors**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src apps/web/next.config.js apps/web/tsconfig.json packages/db
git commit -m "feat(web): @supabase/ssr auth infrastructure + @berber/db path wiring"
```

---

## Task 1: Move slugify and DEFAULT_WORKING_HOURS to packages/shared

**Files:**
- Create: `packages/shared/src/slug-utils.ts`
- Create: `packages/shared/src/working-hours.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/mobile/lib/onboarding-utils.ts` (convert to re-export)

- [ ] **Step 1: Create `packages/shared/src/slug-utils.ts`**

```typescript
const TR_MAP: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
  Ç: 'C', Ğ: 'G', İ: 'I', Ö: 'O', Ş: 'S', Ü: 'U',
};

export function slugify(text: string): string {
  return text
    .split('').map(c => TR_MAP[c] ?? c).join('')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}
```

- [ ] **Step 2: Create `packages/shared/src/working-hours.ts`**

```typescript
import type { WorkingHours } from './types';

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  mon: { open: '09:00', close: '19:00', enabled: true },
  tue: { open: '09:00', close: '19:00', enabled: true },
  wed: { open: '09:00', close: '19:00', enabled: true },
  thu: { open: '09:00', close: '19:00', enabled: true },
  fri: { open: '09:00', close: '19:00', enabled: true },
  sat: { open: '10:00', close: '17:00', enabled: true },
  sun: { open: '09:00', close: '19:00', enabled: false },
};
```

- [ ] **Step 3: Add exports to `packages/shared/src/index.ts`**

Append below the existing exports:
```typescript
export { slugify } from './slug-utils';
export { DEFAULT_WORKING_HOURS } from './working-hours';
```

- [ ] **Step 4: Update `apps/mobile/lib/onboarding-utils.ts` — remove local slugify, import from shared**

```typescript
// REMOVE these blocks:
// const TR_MAP ...
// export function slugify ...
// export const DEFAULT_WORKING_HOURS ...

// ADD at the top of the file:
export { slugify, DEFAULT_WORKING_HOURS } from '@berber/shared';
// buildBarberLink and buildOnboardingServiceInsert remain unchanged
```

- [ ] **Step 5: Verify packages/shared tsc — slug-utils and working-hours included**

```bash
cd packages/shared && npx tsc --noEmit
```

- [ ] **Step 6: Verify mobile tsc**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src apps/mobile/lib/onboarding-utils.ts
git commit -m "refactor(shared): move slugify + DEFAULT_WORKING_HOURS to packages/shared"
```

---

## Task 2: packages/db Query Helpers

**Files:**
- Create: `packages/db/src/queries/shop.ts`
- Create: `packages/db/src/queries/services.ts`
- Create: `packages/db/src/queries/staff.ts`
- Create: `packages/db/src/queries/appointments.ts`
- Create: `packages/db/src/queries/earnings.ts`
- Modify: `packages/db/src/index.ts`

Every query function takes `SupabaseClient<Database>` as its first argument — mobile and web share the same functions.

- [ ] **Step 1: Create `packages/db/src/queries/shop.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

type Client = SupabaseClient<Database>;

export async function getShopByOwner(client: Client, userId: string) {
  return client
    .from('shops')
    .select('id, slug, name, display_name, address, working_hours, status, timezone')
    .or(`owner_user_id.eq.${userId},owner_id.eq.${userId}`)
    .maybeSingle();
}

export async function updateShop(
  client: Client,
  shopId: string,
  patch: {
    name?: string;
    display_name?: string;
    address?: string;
    working_hours?: Record<string, unknown>;
    timezone?: string;
  },
) {
  return client
    .from('shops')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', shopId)
    .select('id, slug, name, display_name, address, working_hours, status')
    .single();
}
```

- [ ] **Step 2: Create `packages/db/src/queries/services.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

type Client = SupabaseClient<Database>;

export async function getServices(client: Client, shopId: string) {
  return client
    .from('services')
    .select('id, name, duration_min, price_cents, display_order, is_active')
    .eq('shop_id', shopId)
    .order('display_order')
    .order('name');
}

export async function upsertService(
  client: Client,
  shopId: string,
  data: {
    id?: string;
    name: string;
    duration_min: number;
    price_cents: number;
    is_active?: boolean;
  },
) {
  if (data.id) {
    return client
      .from('services')
      .update({ name: data.name, duration_min: data.duration_min, price_cents: data.price_cents, is_active: data.is_active ?? true })
      .eq('id', data.id)
      .eq('shop_id', shopId)
      .select('id, name, duration_min, price_cents, is_active')
      .single();
  }
  return client
    .from('services')
    .insert({ shop_id: shopId, name: data.name, duration_min: data.duration_min, price_cents: data.price_cents, is_active: true })
    .select('id, name, duration_min, price_cents, is_active')
    .single();
}

export async function toggleService(client: Client, serviceId: string, shopId: string, isActive: boolean) {
  return client
    .from('services')
    .update({ is_active: isActive })
    .eq('id', serviceId)
    .eq('shop_id', shopId);
}

export async function deleteService(client: Client, serviceId: string, shopId: string) {
  return client
    .from('services')
    .update({ is_active: false })
    .eq('id', serviceId)
    .eq('shop_id', shopId);
}
```

- [ ] **Step 3: Create `packages/db/src/queries/staff.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

type Client = SupabaseClient<Database>;

export async function getStaff(client: Client, shopId: string) {
  return client
    .from('staff')
    .select('id, user_id, name, role, is_active, slug, created_at')
    .eq('shop_id', shopId)
    .order('created_at');
}

export async function updateStaffName(client: Client, staffId: string, shopId: string, name: string) {
  return client
    .from('staff')
    .update({ name })
    .eq('id', staffId)
    .eq('shop_id', shopId);
}

export async function setStaffActive(client: Client, staffId: string, shopId: string, isActive: boolean) {
  return client
    .from('staff')
    .update({ is_active: isActive })
    .eq('id', staffId)
    .eq('shop_id', shopId);
}

/** Checks whether there is another active staff member before the owner deactivates themselves */
export async function canDeactivateStaff(
  client: Client,
  shopId: string,
  staffIdToDeactivate: string,
): Promise<boolean> {
  const { data, error } = await client
    .from('staff')
    .select('id')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .neq('id', staffIdToDeactivate);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}
```

- [ ] **Step 4: Create `packages/db/src/queries/appointments.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

type Client = SupabaseClient<Database>;

export async function getAppointments(
  client: Client,
  shopId: string,
  opts: { date?: string; staffId?: string; status?: string[] } = {},
) {
  let q = client
    .from('appointments')
    .select(`
      id, starts_at, ends_at, status,
      customer_name, customer_phone, customer_notes,
      booked_price_cents, completed_price_cents,
      staff:staff_id ( id, name ),
      service:service_id ( id, name, duration_min )
    `)
    .in('staff_id',
      client
        .from('staff')
        .select('id')
        .eq('shop_id', shopId) as unknown as string[]
    )
    .order('starts_at');

  if (opts.date) {
    const start = `${opts.date}T00:00:00+03:00`;
    const end   = `${opts.date}T23:59:59+03:00`;
    q = q.gte('starts_at', start).lte('starts_at', end);
  }
  if (opts.staffId) q = q.eq('staff_id', opts.staffId);
  if (opts.status?.length) q = q.in('status', opts.status);

  return q;
}

export async function updateAppointmentStatus(
  client: Client,
  appointmentId: string,
  status: 'confirmed' | 'completed' | 'cancelled',
  completedPriceCents?: number,
) {
  const patch: Record<string, unknown> = { status };
  if (status === 'completed') {
    patch.completed_at = new Date().toISOString();
    if (completedPriceCents !== undefined) patch.completed_price_cents = completedPriceCents;
  }
  return client.from('appointments').update(patch).eq('id', appointmentId);
}
```

- [ ] **Step 5: Create `packages/db/src/queries/earnings.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

type Client = SupabaseClient<Database>;

export type EarningsPeriod = 'day' | '7' | '30';

export async function getEarningsReport(client: Client, shopId: string, period: EarningsPeriod) {
  const days = period === 'day' ? 1 : period === '7' ? 7 : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  return client
    .from('appointments')
    .select(`
      id, completed_price_cents, completed_commission_cents,
      completed_shop_share_cents, completed_at,
      staff:staff_id ( id, name )
    `)
    .in('staff_id',
      client.from('staff').select('id').eq('shop_id', shopId) as unknown as string[]
    )
    .eq('status', 'completed')
    .gte('completed_at', since)
    .order('completed_at', { ascending: false });
}
```

- [ ] **Step 6: Update `packages/db/src/index.ts`**

```typescript
export type { Database, Json } from './database.types';
export * from './queries/shop';
export * from './queries/services';
export * from './queries/staff';
export * from './queries/appointments';
export * from './queries/earnings';
```

- [ ] **Step 7: Add packages/db tsconfig and verify tsc**

Create `packages/db/tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2017",
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

```bash
cd packages/db && npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add packages/db
git commit -m "feat(db): add query helpers for shop, services, staff, appointments, earnings"
```

---

## Task 3: /giris Login Page

**Files:**
- Create: `apps/web/src/app/giris/page.tsx`

- [ ] **Step 1: Create `apps/web/src/app/giris/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export default function GirisPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') ?? '/dashboard';

  const [email, setEmail]       = useState('');
  const [pass, setPass]         = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
      if (error) { setError(error.message); return; }
      router.push(redirect);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?redirect=${redirect}` },
    });
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Link href="/" className="text-sm font-bold text-gray-900 tracking-tight">Sıradaki</Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-gray-400">Dükkan Paneli</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 tracking-tight">Giriş Yap</h1>
        </div>

        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google ile Giriş Yap
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">veya</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="berber@dukkan.com"
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Şifre
            </label>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="Şifren"
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email || !pass}
            className="w-full bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Hesabın yok mu?{' '}
          <Link href="/kayit" className="text-blue-900 font-semibold hover:underline">
            Ücretsiz başla
          </Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Google OAuth callback route**

`apps/web/src/app/auth/callback/route.ts`:
```typescript
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code     = searchParams.get('code');
  const redirect = searchParams.get('redirect') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${redirect}`);
}
```

- [ ] **Step 3: Run tsc**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/giris apps/web/src/app/auth
git commit -m "feat(web): /giris login page + Google OAuth callback"
```

---

## Task 4: /kayit Register Page

**Files:**
- Create: `apps/web/src/app/kayit/page.tsx`

Flow: email + password + shop name → `auth.signUp` → `shops.insert` → `/dashboard`
Slug is auto-generated: `slugify(shopName)`, shown as a live preview — the word "slug" is never surfaced to the user.

- [ ] **Step 1: Create `apps/web/src/app/kayit/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { slugify, DEFAULT_WORKING_HOURS } from '@berber/shared';

export default function KayitPage() {
  const router = useRouter();

  const [shopName, setShopName] = useState('');
  const [email, setEmail]       = useState('');
  const [pass, setPass]         = useState('');
  const [passConf, setPassConf] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const slug       = slugify(shopName);
  const passErr    = pass.length > 0 && pass.length < 8 ? 'En az 8 karakter gerekli' : null;
  const confErr    = passConf && pass !== passConf ? 'Şifreler eşleşmiyor' : null;
  const emailErr   = email && !email.includes('@') ? 'Geçerli bir e-posta gir' : null;
  const canSubmit  = shopName.trim().length >= 2 && email.includes('@') && pass.length >= 8 && pass === passConf;

  const passScore  = pass.length >= 12 ? 3 : pass.length >= 8 ? 2 : pass.length > 0 ? 1 : 0;
  const scoreLabel = ['', 'Zayıf', 'Orta', 'Güçlü'][passScore];
  const scoreColor = ['', 'text-red-500', 'text-yellow-600', 'text-green-600'][passScore];
  const barColor   = ['', 'bg-red-400', 'bg-yellow-400', 'bg-green-500'][passScore];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const trimmed  = shopName.trim();

      const { data: authData, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: { data: { shop_name: trimmed } },
      });
      if (signUpErr || !authData.user) {
        setError(signUpErr?.message ?? 'Kayıt başarısız.');
        return;
      }

      const { error: shopErr } = await supabase.from('shops').insert({
        owner_user_id: authData.user.id,
        name:          trimmed,
        display_name:  trimmed,
        slug,
        working_hours: DEFAULT_WORKING_HOURS,
      });
      if (shopErr) {
        if (shopErr.code === '23505') {
          setError('Bu dükkan adı zaten alınmış. Farklı bir isim dene.');
        } else {
          setError('Dükkan oluşturulamadı: ' + shopErr.message);
        }
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Link href="/" className="text-sm font-bold text-gray-900 tracking-tight">Sıradaki</Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-gray-400">Dükkan Paneli</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 tracking-tight">Hesap Oluştur</h1>
          <p className="mt-1 text-sm text-gray-500">Dükkanını Sıradaki&apos;ye ekle, randevularını online al.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Dükkan Adı
            </label>
            <input
              type="text"
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              placeholder="örn. Keskin Berber"
              className="w-full px-3 py-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white outline-none transition border-gray-200 focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-gray-400">Müşteriler bu ismi görecek</p>
            {slug && (
              <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-gray-500">Randevu linkin:</p>
                <p className="text-xs font-semibold text-blue-900 mt-0.5">
                  siradaki.app/<span className="text-blue-700">{slug}</span>
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="berber@dukkan.com"
              className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white outline-none transition ${emailErr ? 'border-red-400' : 'border-gray-200 focus:border-blue-900 focus:ring-2 focus:ring-blue-100'}`}
            />
            {emailErr && <p className="mt-1 text-xs text-red-500">{emailErr}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Şifre
            </label>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="En az 8 karakter"
              className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white outline-none transition ${passErr ? 'border-red-400' : 'border-gray-200 focus:border-blue-900 focus:ring-2 focus:ring-blue-100'}`}
            />
            {pass && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  {[1,2,3].map(i => (
                    <div key={i} className={`flex-1 h-1 rounded-full ${i <= passScore ? barColor : 'bg-gray-200'}`} />
                  ))}
                </div>
                <span className={`text-xs font-semibold ${scoreColor}`}>{scoreLabel}</span>
              </div>
            )}
            {passErr && <p className="mt-1 text-xs text-red-500">{passErr}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Şifre Tekrar
            </label>
            <input
              type="password"
              value={passConf}
              onChange={e => setPassConf(e.target.value)}
              placeholder="Şifreni tekrar gir"
              className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white outline-none transition ${confErr ? 'border-red-400' : 'border-gray-200 focus:border-blue-900 focus:ring-2 focus:ring-blue-100'}`}
            />
            {confErr && <p className="mt-1 text-xs text-red-500">{confErr}</p>}
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Kayıt olarak{' '}
            <Link href="/kullanim-kosullari" className="text-blue-900 font-semibold">Kullanım Koşulları</Link>
            &apos;nı ve{' '}
            <Link href="/gizlilik-politikasi" className="text-blue-900 font-semibold">Gizlilik Politikası</Link>
            &apos;nı kabul etmiş olursun.
          </p>

          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Hesap oluşturuluyor…' : 'Hesap Oluştur'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Hesabın var mı?{' '}
          <Link href="/giris" className="text-blue-900 font-semibold hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tsc**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/kayit
git commit -m "feat(web): /kayit register page with auto-slug preview"
```

---

## Task 5: Dashboard Layout — Sidebar + Mobile Nav

**Files:**
- Create: `apps/web/src/app/dashboard/layout.tsx`
- Create: `apps/web/src/components/dashboard/Sidebar.tsx`
- Create: `apps/web/src/components/dashboard/MobileNav.tsx`

The dashboard layout is a server component that checks session; Sidebar and MobileNav are client components.

- [ ] **Step 1: Create `apps/web/src/components/dashboard/Sidebar.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Calendar, Scissors, Users, TrendingUp, Settings, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

const NAV = [
  { href: '/dashboard',           label: 'Özet',      icon: LayoutDashboard },
  { href: '/dashboard/ajanda',    label: 'Ajanda',    icon: Calendar },
  { href: '/dashboard/hizmetler', label: 'Hizmetler', icon: Scissors },
  { href: '/dashboard/ekip',      label: 'Ekip',      icon: Users },
  { href: '/dashboard/gelir',     label: 'Gelir',     icon: TrendingUp },
  { href: '/dashboard/ayarlar',   label: 'Ayarlar',   icon: Settings },
];

export function Sidebar({ shopName }: { shopName: string }) {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/giris');
    router.refresh();
  }

  return (
    <aside className="hidden lg:flex flex-col w-56 border-r border-gray-100 bg-white h-screen sticky top-0">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Sıradaki</p>
        <p className="text-sm font-bold text-gray-900 truncate">{shopName}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-900'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} className={active ? 'text-blue-900' : 'text-gray-400'} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        >
          <LogOut size={16} className="text-gray-400" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create `apps/web/src/components/dashboard/MobileNav.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Scissors, Users, TrendingUp } from 'lucide-react';

const NAV = [
  { href: '/dashboard',           label: 'Özet',   icon: LayoutDashboard },
  { href: '/dashboard/ajanda',    label: 'Ajanda', icon: Calendar },
  { href: '/dashboard/hizmetler', label: 'Hizmet', icon: Scissors },
  { href: '/dashboard/ekip',      label: 'Ekip',   icon: Users },
  { href: '/dashboard/gelir',     label: 'Gelir',  icon: TrendingUp },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-40">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
              active ? 'text-blue-900' : 'text-gray-400'
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Create `apps/web/src/app/dashboard/layout.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getShopByOwner } from '@berber/db';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MobileNav } from '@/components/dashboard/MobileNav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: shop } = await getShopByOwner(supabase, user.id);
  if (!shop) redirect('/kayit');

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar shopName={shop.display_name || shop.name || 'Dükkan'} />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
```

- [ ] **Step 4: Run tsc**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/dashboard/layout.tsx apps/web/src/components/dashboard
git commit -m "feat(web): dashboard layout with sidebar + mobile nav"
```

---

## Task 6: Setup Banner + /dashboard Overview Page

**Files:**
- Create: `apps/web/src/components/dashboard/SetupBanner.tsx`
- Create: `apps/web/src/app/dashboard/page.tsx`

Setup checklist items:
- Add a service (`services.count === 0`)
- Set working hours (all days disabled or empty)
- Shop `status === 'pending'` → informational only (user cannot act on it)

- [ ] **Step 1: Create `apps/web/src/components/dashboard/SetupBanner.tsx`**

```tsx
import Link from 'next/link';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface SetupStep {
  key: string;
  label: string;
  href: string;
  done: boolean;
}

interface Props {
  steps: SetupStep[];
  shopPending: boolean;
}

export function SetupBanner({ steps, shopPending }: Props) {
  const remaining = steps.filter(s => !s.done);

  if (remaining.length === 0 && !shopPending) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">
            {remaining.length > 0
              ? `Dükkanın hazır değil — ${remaining.length} adım kaldı`
              : 'Onay bekleniyor'}
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Müşterilerin randevu alabilmesi için aşağıdakileri tamamla.
          </p>

          <ul className="mt-3 space-y-2">
            {steps.map(step => (
              <li key={step.key} className="flex items-center gap-2 text-sm">
                {step.done
                  ? <CheckCircle size={15} className="text-green-600 shrink-0" />
                  : <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 shrink-0" />
                }
                {step.done
                  ? <span className="text-gray-400 line-through">{step.label}</span>
                  : <Link href={step.href} className="text-amber-900 font-medium hover:underline">{step.label} →</Link>
                }
              </li>
            ))}

            {shopPending && (
              <li className="flex items-center gap-2 text-sm">
                <Clock size={15} className="text-blue-500 shrink-0" />
                <span className="text-gray-600">Admin onayı bekleniyor — onaylandıktan sonra rezervasyon linkin aktif olur</span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/src/app/dashboard/page.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getShopByOwner, getServices, getStaff, getAppointments } from '@berber/db';
import { SetupBanner } from '@/components/dashboard/SetupBanner';

function hasWorkingHours(wh: Record<string, unknown> | null): boolean {
  if (!wh) return false;
  const days = Object.values(wh) as Array<{ enabled?: boolean }>;
  return days.some(d => d.enabled === true);
}

function todayTR(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: shop } = await getShopByOwner(supabase, user.id);
  if (!shop) redirect('/kayit');

  const today = todayTR();

  const [{ data: services }, { data: staff }, { data: todayAppts }] = await Promise.all([
    getServices(supabase, shop.id),
    getStaff(supabase, shop.id),
    getAppointments(supabase, shop.id, { date: today }),
  ]);

  const setupSteps = [
    {
      key:   'service',
      label: 'En az bir hizmet ekle',
      href:  '/dashboard/hizmetler',
      done:  (services ?? []).filter(s => s.is_active).length > 0,
    },
    {
      key:   'hours',
      label: 'Çalışma saatlerini ayarla',
      href:  '/dashboard/ayarlar',
      done:  hasWorkingHours(shop.working_hours as Record<string, unknown> | null),
    },
  ];

  const completed  = (todayAppts ?? []).filter(a => a.status === 'completed').length;
  const totalToday = (todayAppts ?? []).length;

  const estRevenue = (todayAppts ?? [])
    .filter(a => a.status !== 'cancelled')
    .reduce((sum, a) => sum + (a.booked_price_cents ?? 0), 0);

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Dükkan Özet</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
          {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h1>
      </div>

      <SetupBanner steps={setupSteps} shopPending={shop.status === 'pending'} />

      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Toplam',     value: String(totalToday),                  sub: 'bugün' },
          { label: 'Tamamlanan', value: String(completed),                   sub: `/ ${totalToday}` },
          { label: 'Tahmini',    value: `${Math.round(estRevenue / 100)} ₺`, sub: 'gelir' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{k.label}</p>
            <p className="text-3xl font-bold text-gray-900 tabular-nums tracking-tight">{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Today's Appointments */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Bugünkü Randevular</p>
        {(todayAppts ?? []).length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-400">Bugün için randevu yok</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
            {(todayAppts ?? []).map(a => {
              const time    = new Date(a.starts_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
              const staff   = a.staff as { name: string } | null;
              const service = a.service as { name: string } | null;
              return (
                <div key={a.id} className="flex items-center gap-4 px-4 py-3">
                  <span className="text-sm font-semibold tabular-nums text-gray-900 w-12 shrink-0">{time}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.customer_name}</p>
                    <p className="text-xs text-gray-400 truncate">{service?.name} · {staff?.name}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    a.status === 'completed' ? 'bg-green-100 text-green-700' :
                    a.status === 'cancelled' ? 'bg-red-50 text-red-500' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    {a.status === 'completed' ? 'Tamamlandı' : a.status === 'cancelled' ? 'İptal' : 'Onaylı'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Staff summary — only shown when there is more than one active staff member */}
      {(staff ?? []).filter(s => s.is_active).length > 1 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Ekip</p>
          <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
            {(staff ?? []).filter(s => s.is_active).map(s => {
              const staffAppts = (todayAppts ?? []).filter(a => (a.staff as { id: string } | null)?.id === s.id);
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-blue-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {(s.name ?? '?')[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">{staffAppts.length} randevu bugün</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run tsc**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/dashboard/SetupBanner.tsx apps/web/src/app/dashboard/page.tsx
git commit -m "feat(web): dashboard overview page + setup completion banner"
```

---

## Task 7: /dashboard/ajanda

**Files:**
- Create: `apps/web/src/app/dashboard/ajanda/page.tsx`

Client component — day picker + appointment list + Supabase realtime subscription.

- [ ] **Step 1: Create `apps/web/src/app/dashboard/ajanda/page.tsx`**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { getAppointments, updateAppointmentStatus } from '@berber/db';

type Appt = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  customer_name: string;
  customer_phone: string | null;
  booked_price_cents: number | null;
  staff: { id: string; name: string } | null;
  service: { id: string; name: string } | null;
};

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('tr-TR', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function todayTR(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
}

export default function AjandaPage() {
  const [date, setDate]       = useState(todayTR);
  const [appts, setAppts]     = useState<Appt[]>([]);
  const [shopId, setShopId]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const load = useCallback(async (d: string, sid: string) => {
    setLoading(true);
    const { data } = await getAppointments(supabase, sid, { date: d });
    setAppts((data ?? []) as unknown as Appt[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
        .maybeSingle();
      if (!shop) return;
      setShopId(shop.id);
      await load(date, shop.id);

      // Realtime subscription — reload on any appointment change
      const channel = supabase
        .channel(`ajanda-${shop.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'appointments',
        }, () => load(date, shop.id))
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
    init();
  }, []);

  useEffect(() => {
    if (shopId) load(date, shopId);
  }, [date, shopId]);

  async function handleStatus(id: string, status: 'completed' | 'cancelled') {
    await updateAppointmentStatus(supabase, id, status);
    if (shopId) load(date, shopId);
  }

  const isToday = date === todayTR();

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Randevular</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-1">Ajanda</h1>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setDate(d => addDays(d, -1))} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold text-gray-900">{formatDate(date)}</p>
          {isToday && <p className="text-xs text-blue-600 font-medium">Bugün</p>}
        </div>
        <button onClick={() => setDate(d => addDays(d, 1))} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ChevronRight size={16} />
        </button>
        {!isToday && (
          <button onClick={() => setDate(todayTR())} className="text-xs text-blue-700 font-semibold px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors">
            Bugün
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-5 h-5 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : appts.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
          <p className="text-sm text-gray-400">Bu gün için randevu yok</p>
        </div>
      ) : (
        <div className="space-y-2">
          {appts.map(a => {
            const startTime = new Date(a.starts_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
            const endTime   = new Date(a.ends_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
            return (
              <div key={a.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold tabular-nums text-gray-900">{startTime}–{endTime}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        a.status === 'completed' ? 'bg-green-100 text-green-700' :
                        a.status === 'cancelled' ? 'bg-red-50 text-red-500' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {a.status === 'completed' ? 'Tamamlandı' : a.status === 'cancelled' ? 'İptal' : 'Onaylı'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{a.customer_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.service?.name ?? '—'} · {a.staff?.name ?? '—'}
                      {a.booked_price_cents ? ` · ${Math.round(a.booked_price_cents / 100)} ₺` : ''}
                    </p>
                    {a.customer_phone && (
                      <p className="text-xs text-gray-400 mt-0.5">{a.customer_phone}</p>
                    )}
                  </div>
                  {a.status === 'confirmed' && (
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => handleStatus(a.id, 'completed')}
                        className="text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1 rounded-lg transition-colors"
                      >
                        Tamamla
                      </button>
                      <button
                        onClick={() => handleStatus(a.id, 'cancelled')}
                        className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors"
                      >
                        İptal
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run tsc + commit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
git add apps/web/src/app/dashboard/ajanda
git commit -m "feat(web): /dashboard/ajanda with day navigation + realtime updates"
```

---

## Task 8: /dashboard/hizmetler

**Files:**
- Create: `apps/web/src/app/dashboard/hizmetler/page.tsx`

- [ ] **Step 1: Create `apps/web/src/app/dashboard/hizmetler/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { getServices, upsertService, toggleService, deleteService } from '@berber/db';

type Service = {
  id: string;
  name: string;
  duration_min: number;
  price_cents: number | null;
  is_active: boolean;
};

type Form = { id?: string; name: string; duration_min: number; price: string; is_active: boolean };

const DURATIONS = [15, 20, 30, 45, 60, 90, 120];
const EMPTY_FORM: Form = { name: '', duration_min: 30, price: '', is_active: true };

export default function HizmetlerPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [shopId, setShopId]     = useState<string | null>(null);
  const [form, setForm]         = useState<Form | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const supabase = createClient();

  async function load(sid: string) {
    const { data } = await getServices(supabase, sid);
    setServices((data ?? []) as Service[]);
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: shop } = await supabase
        .from('shops').select('id')
        .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
        .maybeSingle();
      if (!shop) return;
      setShopId(shop.id);
      load(shop.id);
    }
    init();
  }, []);

  async function handleSave() {
    if (!form || !shopId) return;
    if (!form.name.trim()) { setError('Hizmet adı gerekli'); return; }
    setSaving(true); setError(null);
    try {
      const { error } = await upsertService(supabase, shopId, {
        id: form.id,
        name: form.name.trim(),
        duration_min: form.duration_min,
        price_cents: Math.round(Number(form.price) * 100),
        is_active: form.is_active,
      });
      if (error) { setError(error.message); return; }
      setForm(null);
      load(shopId);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(svc: Service) {
    if (!shopId) return;
    await toggleService(supabase, svc.id, shopId, !svc.is_active);
    load(shopId);
  }

  async function handleDelete(svcId: string) {
    if (!shopId || !confirm('Bu hizmeti silmek istediğine emin misin?')) return;
    await deleteService(supabase, svcId, shopId);
    load(shopId);
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Dükkan</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-1">Hizmetler</h1>
        </div>
        <button
          onClick={() => setForm(EMPTY_FORM)}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Hizmet Ekle
        </button>
      </div>

      {form && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-900">{form.id ? 'Hizmeti Düzenle' : 'Yeni Hizmet'}</p>
            <button onClick={() => setForm(null)}><X size={16} className="text-gray-400" /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Hizmet Adı</label>
              <input
                value={form.name}
                onChange={e => setForm(f => f && ({ ...f, name: e.target.value }))}
                placeholder="örn. Saç Kesimi"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Süre (dakika)</label>
              <div className="grid grid-cols-7 gap-1.5">
                {DURATIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setForm(f => f && ({ ...f, duration_min: d }))}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors ${
                      form.duration_min === d
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {d}
                    <span className="opacity-60 text-[9px] font-semibold"> dk</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Fiyat (₺)</label>
              <input
                type="number"
                value={form.price}
                onChange={e => setForm(f => f && ({ ...f, price: e.target.value }))}
                placeholder="örn. 200"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
          <div className="flex gap-2 mt-5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
            >
              {saving ? 'Kaydediliyor…' : form.id ? 'Kaydet' : 'Ekle'}
            </button>
            <button onClick={() => setForm(null)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              İptal
            </button>
          </div>
        </div>
      )}

      {services.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
          <p className="text-sm text-gray-400">Henüz hizmet eklenmedi</p>
          <p className="text-xs text-gray-300 mt-1">Müşterilerin randevu alabilmesi için en az bir hizmet ekle</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
          {services.map(svc => (
            <div key={svc.id} className={`flex items-center gap-4 px-4 py-3.5 ${!svc.is_active ? 'opacity-50' : ''}`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${svc.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{svc.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full text-gray-500">{svc.duration_min} dk</span>
                  {svc.price_cents != null && (
                    <span className="text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full font-bold">
                      {Math.round(svc.price_cents / 100)} ₺
                    </span>
                  )}
                  {!svc.is_active && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Pasif</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setForm({ id: svc.id, name: svc.name, duration_min: svc.duration_min, price: String(Math.round((svc.price_cents ?? 0) / 100)), is_active: svc.is_active })}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Pencil size={14} className="text-gray-400" />
                </button>
                <button onClick={() => handleToggle(svc)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  {svc.is_active
                    ? <X size={14} className="text-gray-400" />
                    : <Check size={14} className="text-green-600" />}
                </button>
                <button onClick={() => handleDelete(svc.id)} className="p-2 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run tsc + commit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
git add apps/web/src/app/dashboard/hizmetler
git commit -m "feat(web): /dashboard/hizmetler service management"
```

---

## Task 9: /dashboard/ekip

**Files:**
- Create: `apps/web/src/app/dashboard/ekip/page.tsx`

Rule: the owner cannot deactivate themselves if they are the only active staff member — enforced via `canDeactivateStaff`.

- [ ] **Step 1: Create `apps/web/src/app/dashboard/ekip/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { UserPlus, UserX, UserCheck, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { getStaff, setStaffActive, canDeactivateStaff } from '@berber/db';

type Staff = {
  id: string;
  user_id: string | null;
  name: string;
  role: string;
  is_active: boolean;
  slug: string | null;
};

export default function EkipPage() {
  const [staff, setStaff]           = useState<Staff[]>([]);
  const [shopId, setShopId]         = useState<string | null>(null);
  const [shopSlug, setShopSlug]     = useState<string | null>(null);
  const [ownerId, setOwnerId]       = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviting, setInviting]     = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const supabase = createClient();

  async function load(sid: string) {
    const { data } = await getStaff(supabase, sid);
    setStaff((data ?? []) as Staff[]);
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setOwnerId(user.id);
      const { data: shop } = await supabase
        .from('shops').select('id, slug')
        .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
        .maybeSingle();
      if (!shop) return;
      setShopId(shop.id);
      setShopSlug(shop.slug);
      load(shop.id);
    }
    init();
  }, []);

  async function handleToggleActive(s: Staff) {
    if (!shopId) return;
    if (!s.is_active) {
      await setStaffActive(supabase, s.id, shopId, true);
      load(shopId);
      return;
    }
    const canDeactivate = await canDeactivateStaff(supabase, shopId, s.id);
    if (!canDeactivate) {
      setError('Başka aktif personel eklemeden kendinizi devre dışı bırakamazsınız.');
      return;
    }
    if (!confirm(`${s.name} adlı personeli pasif yapmak istediğine emin misin?`)) return;
    await setStaffActive(supabase, s.id, shopId, false);
    load(shopId);
  }

  async function handleInvite() {
    if (!shopId) return;
    setInviting(true); setError(null); setInviteLink(null);
    try {
      const res = await fetch('/api/invite-barber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shopId }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Davet oluşturulamadı'); return; }
      setInviteLink(json.invite_link ?? json.deep_link ?? null);
    } finally {
      setInviting(false);
    }
  }

  const activeStaff   = staff.filter(s => s.is_active);
  const inactiveStaff = staff.filter(s => !s.is_active);

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Ekip Yönetimi</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-1">Ustalar</h1>
        </div>
        <button
          onClick={handleInvite}
          disabled={inviting}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <UserPlus size={16} /> Personel Ekle
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {inviteLink && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
          <p className="text-sm font-semibold text-blue-900 mb-1">Davet Linki Oluşturuldu</p>
          <p className="text-xs text-blue-700 mb-2">Bu linki personeline WhatsApp veya SMS ile gönder.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border border-blue-200 rounded-lg px-3 py-2 break-all">{inviteLink}</code>
            <button
              onClick={() => navigator.clipboard.writeText(inviteLink)}
              className="text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              Kopyala
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50 mb-4">
        {activeStaff.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Aktif personel yok</div>
        ) : activeStaff.map(s => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-full bg-blue-900 text-white text-sm font-bold flex items-center justify-center shrink-0">
              {(s.name ?? '?')[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{s.name}</p>
              <p className="text-xs text-gray-400">
                {s.role === 'admin' ? 'Yönetici' : 'Personel'}
                {s.user_id === ownerId ? ' · Hesap Sahibi' : s.user_id ? ' · Kayıtlı' : ' · Davet bekleniyor'}
              </p>
            </div>
            {s.slug && shopSlug && (
              <a href={`/${shopSlug}/u/${s.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <ExternalLink size={14} className="text-gray-400" />
              </a>
            )}
            <button onClick={() => handleToggleActive(s)} className="p-2 rounded-lg hover:bg-red-50 transition-colors">
              <UserX size={14} className="text-gray-400 hover:text-red-500" />
            </button>
          </div>
        ))}
      </div>

      {inactiveStaff.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Pasif</p>
          <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50 opacity-60">
            {inactiveStaff.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-full bg-gray-300 text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {(s.name ?? '?')[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{s.name}</p>
                  <p className="text-xs text-gray-400">Pasif</p>
                </div>
                <button onClick={() => handleToggleActive(s)} className="p-2 rounded-lg hover:bg-green-50 transition-colors">
                  <UserCheck size={14} className="text-gray-400 hover:text-green-600" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run tsc + commit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
git add apps/web/src/app/dashboard/ekip
git commit -m "feat(web): /dashboard/ekip team management with owner-protection guard"
```

---

## Task 10: /dashboard/gelir

**Files:**
- Create: `apps/web/src/app/dashboard/gelir/page.tsx`

Server component — period selected via query param.

- [ ] **Step 1: Create `apps/web/src/app/dashboard/gelir/page.tsx`**

```tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getShopByOwner, getEarningsReport, type EarningsPeriod } from '@berber/db';

const PERIODS: { key: EarningsPeriod; label: string }[] = [
  { key: 'day', label: 'Bugün' },
  { key: '7',   label: '7 gün' },
  { key: '30',  label: '30 gün' },
];

export default async function GelirPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: shop } = await getShopByOwner(supabase, user.id);
  if (!shop) redirect('/kayit');

  const { period: periodParam } = await searchParams;
  const period: EarningsPeriod =
    periodParam === 'day' || periodParam === '7' || periodParam === '30'
      ? periodParam
      : '30';

  const { data: appts } = await getEarningsReport(supabase, shop.id, period);

  const rows            = appts ?? [];
  const totalRevenue    = rows.reduce((s, a) => s + (a.completed_price_cents ?? 0), 0);
  const totalCommission = rows.reduce((s, a) => s + (a.completed_commission_cents ?? 0), 0);
  const shopShare       = rows.reduce((s, a) => s + (a.completed_shop_share_cents ?? 0), 0);

  // Group by staff member
  const staffMap = new Map<string, { name: string; count: number; revenue: number; commission: number }>();
  for (const a of rows) {
    const s = a.staff as { id: string; name: string } | null;
    if (!s) continue;
    const existing = staffMap.get(s.id) ?? { name: s.name, count: 0, revenue: 0, commission: 0 };
    staffMap.set(s.id, {
      name:       s.name,
      count:      existing.count + 1,
      revenue:    existing.revenue + (a.completed_price_cents ?? 0),
      commission: existing.commission + (a.completed_commission_cents ?? 0),
    });
  }
  const staffRows = Array.from(staffMap.values()).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Komisyon</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-1">Kazanç</h1>
      </div>

      <div className="flex gap-2 mb-6">
        {PERIODS.map(p => (
          <Link
            key={p.key}
            href={`/dashboard/gelir?period=${p.key}`}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              period === p.key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <div className="bg-gray-900 rounded-2xl p-5 mb-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-3">
          Tamamlanan Ciro · {PERIODS.find(p => p.key === period)?.label}
        </p>
        <p className="text-4xl font-bold tabular-nums tracking-tight mb-4">
          {Math.round(totalRevenue / 100).toLocaleString('tr-TR')} ₺
        </p>
        <div className="flex gap-6">
          <div>
            <p className="text-xs opacity-50">Usta komisyonu</p>
            <p className="text-sm font-semibold">{Math.round(totalCommission / 100).toLocaleString('tr-TR')} ₺</p>
          </div>
          <div>
            <p className="text-xs opacity-50">Dükkan payı</p>
            <p className="text-sm font-semibold">{Math.round(shopShare / 100).toLocaleString('tr-TR')} ₺</p>
          </div>
          <div>
            <p className="text-xs opacity-50">Randevu</p>
            <p className="text-sm font-semibold">{rows.length}</p>
          </div>
        </div>
      </div>

      {staffRows.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Personel Dağılımı</p>
          <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
            {staffRows.map(s => (
              <div key={s.name} className="px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-900 text-white text-xs font-bold flex items-center justify-center">
                    {s.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.count} tamamlanan randevu</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{Math.round(s.revenue / 100).toLocaleString('tr-TR')} ₺</p>
                  <p className="text-xs text-gray-400">Pay: {Math.round(s.commission / 100).toLocaleString('tr-TR')} ₺</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {rows.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
          <p className="text-sm text-gray-400">Bu dönemde tamamlanan randevu yok</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run tsc + commit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
git add apps/web/src/app/dashboard/gelir
git commit -m "feat(web): /dashboard/gelir earnings report with period filter"
```

---

## Task 11: /dashboard/ayarlar

**Files:**
- Create: `apps/web/src/app/dashboard/ayarlar/page.tsx`

Shop name, city, working hours, booking link share.

- [ ] **Step 1: Create `apps/web/src/app/dashboard/ayarlar/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { updateShop } from '@berber/db';
import type { WorkingHours, WorkingDayHours } from '@berber/shared';

const DAYS: { key: keyof WorkingHours; label: string }[] = [
  { key: 'mon', label: 'Pazartesi' },
  { key: 'tue', label: 'Salı' },
  { key: 'wed', label: 'Çarşamba' },
  { key: 'thu', label: 'Perşembe' },
  { key: 'fri', label: 'Cuma' },
  { key: 'sat', label: 'Cumartesi' },
  { key: 'sun', label: 'Pazar' },
];

export default function AyarlarPage() {
  const [shopId, setShopId]   = useState<string | null>(null);
  const [slug, setSlug]       = useState('');
  const [name, setName]       = useState('');
  const [address, setAddress] = useState('');
  const [wh, setWh]           = useState<WorkingHours | null>(null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [copied, setCopied]   = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: shop } = await supabase
        .from('shops')
        .select('id, slug, name, display_name, address, working_hours')
        .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
        .maybeSingle();
      if (!shop) return;
      setShopId(shop.id);
      setSlug(shop.slug ?? '');
      setName(shop.display_name || shop.name || '');
      setAddress(shop.address ?? '');
      setWh((shop.working_hours as WorkingHours) ?? null);
    }
    init();
  }, []);

  function setDay(key: keyof WorkingHours, patch: Partial<WorkingDayHours>) {
    setWh(prev => prev ? { ...prev, [key]: { ...prev[key], ...patch } } : prev);
  }

  async function handleSave() {
    if (!shopId || !wh) return;
    setSaving(true); setSaved(false);
    try {
      const { error } = await updateShop(supabase, shopId, {
        name,
        display_name: name,
        address,
        working_hours: wh as unknown as Record<string, unknown>,
      });
      if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(`https://siradaki.app/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Dükkan</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-1">Ayarlar</h1>
      </div>

      {/* Booking link */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">Randevu Linkin</p>
        <div className="flex items-center gap-2">
          <p className="flex-1 text-sm font-semibold text-blue-900">siradaki.app/{slug}</p>
          <button onClick={copyLink} className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Kopyalandı' : 'Kopyala'}
          </button>
          <a href={`/${slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-blue-100 transition-colors">
            <ExternalLink size={14} className="text-blue-600" />
          </a>
        </div>
      </div>

      {/* Shop info */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-900">Dükkan Bilgileri</p>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Dükkan Adı</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Şehir / Adres</label>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="örn. Beşiktaş, İstanbul"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
      </div>

      {/* Working hours */}
      {wh && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">Çalışma Saatleri</p>
          <div className="space-y-3">
            {DAYS.map(({ key, label }) => {
              const day = wh[key];
              return (
                <div key={key} className="flex items-center gap-3">
                  <button
                    onClick={() => setDay(key, { enabled: !day.enabled })}
                    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${day.enabled ? 'bg-blue-900' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${day.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm text-gray-700 w-24 shrink-0">{label}</span>
                  {day.enabled ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={day.open ?? '09:00'}
                        onChange={e => setDay(key, { open: e.target.value })}
                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:bg-white focus:border-blue-900 outline-none"
                      />
                      <span className="text-xs text-gray-400">–</span>
                      <input
                        type="time"
                        value={day.close ?? '19:00'}
                        onChange={e => setDay(key, { close: e.target.value })}
                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:bg-white focus:border-blue-900 outline-none"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 flex-1">Kapalı</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <Check size={15} /> Kaydedildi
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tsc + commit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
git add apps/web/src/app/dashboard/ayarlar
git commit -m "feat(web): /dashboard/ayarlar shop settings + working hours"
```

---

## Self-Review

### Spec Coverage
- [x] /giris — email + Google OAuth (Task 3)
- [x] /kayit — shop name + auto-slug + registration (Task 4)
- [x] Dashboard layout — sidebar + mobile nav (Task 5)
- [x] Setup banner — service + working hours + pending status (Task 6)
- [x] Overview KPIs + today's appointments (Task 6)
- [x] Agenda — day navigation + status update + realtime (Task 7)
- [x] Services — full CRUD + toggle (Task 8)
- [x] Team — invite + owner-protection guard (Task 9)
- [x] Earnings — period filter + staff breakdown (Task 10)
- [x] Settings — shop info + working hours (Task 11)
- [x] packages/db query layer — client-agnostic (Task 2)
- [x] slugify shared (Task 1)
- [x] Middleware route protection (Task 0)

### Type Consistency
- `getShopByOwner`, `getServices`, `getStaff`, `getAppointments`, `getEarningsReport`, `updateShop`, `upsertService`, `toggleService`, `deleteService`, `setStaffActive`, `canDeactivateStaff`, `updateAppointmentStatus` — all exported from `packages/db/src/index.ts`; all pages import from the same source.
- `WorkingHours`, `WorkingDayHours` — imported from `@berber/shared`.
- `EarningsPeriod` — exported from `packages/db/src/queries/earnings.ts`.

### Implementation Notes
- The subquery syntax in `getAppointments` (`in(staffId, client.from(...))`) is not directly supported in Supabase JS v2. During Task 2 implementation, refactor this function to first fetch staff IDs separately, then pass the array to `.in('staff_id', ids)`.
- The `/api/invite-barber` endpoint in Task 9 assumes a Next.js API route that proxies the existing Supabase Edge Function. If it doesn't exist yet, add a simple proxy route before testing Task 9.
