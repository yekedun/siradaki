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
              const apptStaff   = a.staff as { name: string } | null;
              const service = a.service as { name: string } | null;
              return (
                <div key={a.id} className="flex items-center gap-4 px-4 py-3">
                  <span className="text-sm font-semibold tabular-nums text-gray-900 w-12 shrink-0">{time}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.customer_name}</p>
                    <p className="text-xs text-gray-400 truncate">{service?.name} · {apptStaff?.name}</p>
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
