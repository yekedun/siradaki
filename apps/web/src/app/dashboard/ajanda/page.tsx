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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (shopId) load(date, shopId);
  }, [date, shopId]); // eslint-disable-line react-hooks/exhaustive-deps

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

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setDate(d => addDays(d, -1))}
          disabled={isToday}
          className={`p-2 rounded-lg border border-gray-200 transition-colors ${isToday ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-50'}`}
        >
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
