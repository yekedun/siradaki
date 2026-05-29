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
