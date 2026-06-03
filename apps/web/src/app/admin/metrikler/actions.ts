'use server';

import { createClient } from '@supabase/supabase-js';
import { assertAdmin } from '../dukkanlar/actions';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export type DailyStat = {
  date: string;    // 'YYYY-MM-DD'
  shops: number;
  appointments: number;
};

export type Metrics = {
  totalShops: number;
  activeShops: number;
  pendingShops: number;
  totalUsers: number;
  dailyStats: DailyStat[];
};

export async function getMetrics(adminKey: string): Promise<Metrics> {
  assertAdmin(adminKey);
  const supabase = getAdminClient();

  // Özet sayılar — paralel sorgular
  const [shopsRes, activeRes, pendingRes, usersRes, dailyShopsRes, dailyAppRes] =
    await Promise.all([
      supabase.from('shops').select('id', { count: 'exact', head: true }),
      supabase.from('shops').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('shops').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('staff').select('user_id', { count: 'exact', head: true }),

      // Son 30 günlük yeni dükkanlar
      supabase.from('shops')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

      // Son 30 günlük yeni randevular
      supabase.from('appointments')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

  // Son 30 günlük tarih dizisi oluştur
  const days: DailyStat[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
    return {
      date: d.toISOString().slice(0, 10),
      shops: 0,
      appointments: 0,
    };
  });

  // Dükkan kayıtlarını günlere dağıt
  for (const row of dailyShopsRes.data ?? []) {
    const d = row.created_at.slice(0, 10);
    const entry = days.find(x => x.date === d);
    if (entry) entry.shops += 1;
  }

  // Randevuları günlere dağıt
  for (const row of dailyAppRes.data ?? []) {
    const d = row.created_at.slice(0, 10);
    const entry = days.find(x => x.date === d);
    if (entry) entry.appointments += 1;
  }

  return {
    totalShops:   shopsRes.count   ?? 0,
    activeShops:  activeRes.count  ?? 0,
    pendingShops: pendingRes.count ?? 0,
    totalUsers:   usersRes.count   ?? 0,
    dailyStats:   days,
  };
}
