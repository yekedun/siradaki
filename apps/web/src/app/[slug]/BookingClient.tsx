'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ServiceSelector, type Service } from '../../components/ServiceSelector';
import { SlotGrid } from '../../components/SlotGrid';
import { BookingModal } from '../../components/BookingModal';
import { createClient } from '../../lib/supabase/browser';
import { shouldShowPersonalLinkBadge, slotBroadcastAffectsSelection } from './booking-flow-state';
import { toTimeLabel } from './booking-time';
import { toggleService, computeTotals, buildServiceSummary } from '@berber/shared/booking-selection';
import { trackWebEvent } from '../../lib/analytics';

interface StaffMember { id: string; name: string; phone: string | null; }
interface Shop { id: string; name: string; address: string | null; slug: string; timezone: string; }
interface Props { shop: Shop; services: Service[]; staff: StaffMember[]; preselectedStaffId?: string | null; isPersonalLink?: boolean; }
interface RawSlot { starts_at: string; available: boolean; }

const TR_DAYS = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
const TR_MON  = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function buildDays(n: number): Date[] {
  const todayInIstanbul = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Istanbul' })
  );
  todayInIstanbul.setHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(todayInIstanbul); d.setDate(todayInIstanbul.getDate() + i); return d;
  });
}

const FN_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1';

export default function BookingClient({ shop, services, staff, preselectedStaffId, isPersonalLink = false }: Props) {
  const days = buildDays(14);
  const abortRef = useRef<AbortController | null>(null);

  const [selServices, setSelServices] = useState<string[]>(services[0] ? [services[0].id] : []);
  const [selStaff,   setSelStaff]   = useState<string | null>(preselectedStaffId ?? null);
  const [selDate,    setSelDate]    = useState<Date>(() => {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selSlot,    setSelSlot]    = useState<string | null>(null);
  const [rawSlots,   setRawSlots]   = useState<RawSlot[]>([]);
  const [slotsLoad,  setSlotsLoad]  = useState(false);
  const [slotsErr,   setSlotsErr]   = useState<string | null>(null);
  const [isClosed,   setIsClosed]   = useState(false);
  const [modalOpen,  setModalOpen]  = useState(false);
  const modalSummaryRef = useRef('');
  const modalStartsAtRef = useRef('');

  function handleBookingStart() {
    modalSummaryRef.current  = summary;  // freeze at click-time, before any re-render
    modalStartsAtRef.current = selISO;
    trackWebEvent('web_booking_started', {
      shop_slug: shop.slug,
      ...(selServices.length ? { service_ids: selServices.join(',') } : {}),
      ...(selStaff ? { staff_id: selStaff } : {}),
    });
    setModalOpen(true);
  }

  const fetchSlots = useCallback(async (fresh = false) => {
    if (selServices.length === 0) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSlotsLoad(true); setSlotsErr(null); setSelSlot(null); setIsClosed(false); setRawSlots([]);
    try {
      const qs = new URLSearchParams({
        shop_slug:   shop.slug,
        date:        toDateStr(selDate),
        service_ids: selServices.join(','),
        staff_id:    selStaff ?? 'any',
      });
      // Edge fn yanıtı 30 sn cache'lenir (Cache-Control). Realtime/iade sonrası
      // refetch'lerde bayat slot göstermemek için cache atlanır.
      if (fresh) qs.set('_t', String(Date.now()));
      const res = await fetch(`${FN_BASE}/widget-get-availability?${qs}`, {
        signal: controller.signal,
        ...(fresh ? { cache: 'no-store' as RequestCache } : {}),
      });
      if (!res.ok) { setSlotsErr('Müsaitlik bilgisi alınamadı.'); return; }
      const data = await res.json();
      if (data.closed) setIsClosed(true);
      else setRawSlots(data.slots ?? []);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setSlotsErr('Bağlantı hatası. Tekrar deneyin.');
    } finally {
      setSlotsLoad(false);
    }
  }, [selServices, selDate, selStaff, shop.slug]);

  // Realtime/polling handler'ları kanal aboneliğini bozmadan güncel seçimi
  // görebilsin diye ref'lerde tutulur.
  const fetchSlotsRef = useRef(fetchSlots);
  useEffect(() => { fetchSlotsRef.current = fetchSlots; }, [fetchSlots]);
  const selectionRef = useRef({ date: toDateStr(selDate), staffId: selStaff });
  selectionRef.current = { date: toDateStr(selDate), staffId: selStaff };

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetchSlots(true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      abortRef.current?.abort();
    };
  }, [fetchSlots]);

  // Realtime: appointments/blocks trigger'ı shop_slots:{shop_id} kanalına PII'siz
  // slots_changed yayınlar (migration 20260612100000). Seçili gün/personel
  // etkileniyorsa müsaitlik tazelenir — app'ten eklenen randevu webte anında
  // pasife düşer.
  useEffect(() => {
    const supabase = createClient();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel(`shop_slots:${shop.id}`)
      .on('broadcast', { event: 'slots_changed' }, ({ payload }) => {
        const { date, staffId } = selectionRef.current;
        if (!slotBroadcastAffectsSelection(payload, date, staffId)) return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { fetchSlotsRef.current(true); }, 300);
      })
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [shop.id]);

  // Emniyet kemeri: realtime bağlantısı koparsa 60 sn'de bir taze veri çek.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchSlotsRef.current(true);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const slotItems = rawSlots.map(s => ({ time: toTimeLabel(s.starts_at, shop.timezone), available: s.available }));
  const isAllFull = !isClosed && !slotsLoad && rawSlots.length > 0 && rawSlots.every(s => !s.available);
  const selRaw    = rawSlots.find(s => toTimeLabel(s.starts_at, shop.timezone) === selSlot);
  const selISO    = selRaw?.starts_at ?? '';
  const totals    = computeTotals(services, selServices);
  const svcSummary = buildServiceSummary(services, selServices);
  const selectedStaff = staff.find(s => s.id === selStaff) ?? (staff.length === 1 ? staff[0] : null);
  const staffName = selectedStaff?.name;
  const summary   = svcSummary
    ? `${svcSummary} · ${totals.durationMin} dk · ${toDateStr(selDate).split('-').reverse().join('.')} ${selSlot ?? ''}${staffName ? ' · '+staffName : ''}`
    : '';

  const preselectedName = preselectedStaffId ? staff.find(s => s.id === preselectedStaffId)?.name : null;
  const showBarberBadge = shouldShowPersonalLinkBadge({
    isPersonalLink,
    preselectedStaffId,
    selectedStaffId: selStaff,
    preselectedName,
  });

  return (
    <div className="min-h-screen bg-[#F9F9F6] font-sans text-[#0B1220]">

      {/* Header */}
      <header className="bg-[#0B1220] text-[#F9F9F6] border-b border-[#0B1220]">
        <div className="max-w-[520px] mx-auto px-5 pt-7 pb-8">
          <div className="text-[11px] font-bold tracking-[0.22em] text-[#FF4D1C] uppercase">
            Online Randevu · Sıradaki
          </div>
          <h1 className="font-display text-[56px] leading-[0.9] tracking-normal uppercase mt-3">
            {shop.name}
          </h1>
          {shop.address && (
            <div className="text-sm font-medium text-[#F9F9F6]/55 mt-3 leading-relaxed">{shop.address}</div>
          )}
          {showBarberBadge && (
            <div className="inline-flex items-center gap-1.5 mt-4 bg-[#FF4D1C] border border-[#FF4D1C] text-white text-xs font-bold rounded-none px-3 py-1.5">
              ✂ {preselectedName}&apos;in linkindesin
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="max-w-[520px] mx-auto px-5 pt-7 pb-28">

        {/* 1 — Service (multi-select) */}
        <Section label="Hizmet Seç">
          <ServiceSelector
            services={services}
            selected={selServices}
            onToggle={id => { setSelServices(prev => toggleService(prev, id)); setSelSlot(null); }}
          />
          {totals.count > 0 && (
            <div className="flex items-center justify-between mt-3 px-4 py-3 bg-[#0B1220] text-[#F9F9F6]">
              <span className="text-[11px] font-bold tracking-[0.16em] uppercase">
                {totals.count} hizmet · {totals.durationMin} dk
              </span>
              <span className="text-[18px] font-bold tabular-nums text-[#FF4D1C]">
                {totals.price}₺
              </span>
            </div>
          )}
        </Section>

        {/* 2 — Staff (only if >1 member) */}
        {staff.length > 1 && (
          <Section label="Usta Seç">
            <div className="flex flex-wrap gap-2">
              <StaffChip label="Herhangi" selected={selStaff === null} onClick={() => { setSelStaff(null); setSelSlot(null); }} />
              {staff.map(s => (
                <StaffChip key={s.id} label={s.name ?? 'İsimsiz'} selected={selStaff === s.id} onClick={() => { setSelStaff(s.id); setSelSlot(null); }} />
              ))}
            </div>
          </Section>
        )}

        {/* 3 — Date (unchanged — user-confirmed design, inline styles preserved) */}
        <Section label="Tarih Seç">
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {days.map(d => {
              const str   = toDateStr(d);
              const isSel = str === toDateStr(selDate);
              return (
                <button
                  key={str}
                  onClick={() => { setSelDate(d); setSelSlot(null); }}
                  style={{
                    flexShrink: 0, width: 62, padding: '11px 0', borderRadius: 0,
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                    border: `1.5px solid ${isSel ? '#0B1220' : '#D6DBE5'}`,
                    background: isSel ? '#0B1220' : '#FFFFFF',
                    color: isSel ? '#F9F9F6' : '#0B1220',
                    transition: 'background 140ms, border-color 140ms',
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', opacity: 0.65 }}>
                    {TR_DAYS[d.getDay()]}
                  </div>
                  <div style={{ fontFamily: 'var(--font-bebas-neue)', fontSize: 28, lineHeight: 0.95, marginTop: 5 }}>{d.getDate()}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.55, marginTop: 3 }}>
                    {TR_MON[d.getMonth()]}
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        {/* 4 — Slots */}
        <Section label="Saat Seç">
          <SlotGrid
            slots={slotItems}
            selected={selSlot}
            onSelect={setSelSlot}
            loading={slotsLoad}
            error={slotsErr}
            onRetry={fetchSlots}
            isClosed={isClosed}
            isAllFull={isAllFull}
          />
        </Section>

        {/* Footer — iptal linki */}
        <div className="pt-5 pb-3 border-t border-[#D6DBE5]/50">
          <Link
            href={`/iptal?dukkan=${shop.slug}`}
            className="flex items-center justify-between w-full py-3.5 px-4 bg-white border border-[#D6DBE5] hover:border-[#0B1220] transition-colors duration-150 group"
          >
            <span className="text-sm text-[#0B1220]/55 group-hover:text-[#0B1220]/75 transition-colors">
              Daha önce randevu aldınız mı?
            </span>
            <span className="text-sm font-bold text-[#0B1220] flex items-center gap-1">
              İptal et
              <span className="text-[#FF4D1C]">→</span>
            </span>
          </Link>
        </div>
      </div>

      {/* Sticky CTA */}
      {selSlot && (
        <div
          className="fixed bottom-0 left-0 right-0 px-5 py-3 pb-5 backdrop-blur-md bg-white/80 border-t border-slate-200/60"
          style={{ animation: 'slideUp 180ms ease' }}
        >
          <div className="max-w-[520px] mx-auto">
            <button
              onClick={handleBookingStart}
              className="w-full h-14 rounded-none bg-[#FF4D1C] text-white font-bold text-[15px] tracking-[0.04em] uppercase cursor-pointer border-0 font-sans hover:bg-[#D83E14] transition-colors duration-150"
            >
              Randevu Al · {totals.price}₺ — {selSlot}
            </button>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      <BookingModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelSlot(null); modalSummaryRef.current = ''; modalStartsAtRef.current = ''; }}
        summary={modalSummaryRef.current || summary}
        shopId={shop.id}
        shopSlug={shop.slug}
        staffId={selStaff}
        staffPhone={selectedStaff?.phone ?? null}
        serviceIds={selServices}
        startsAt={modalStartsAtRef.current || selISO}
        onSuccess={() => {
          trackWebEvent('web_booking_completed', {
            shop_slug: shop.slug,
            ...(selServices.length ? { service_ids: selServices.join(',') } : {}),
            ...(selStaff ? { staff_id: selStaff } : {}),
          });
          fetchSlots(true);
        }}
      />
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-9">
      <div className="text-[11px] font-bold tracking-[0.22em] text-[#FF4D1C] uppercase mb-3">
        {label}
      </div>
      {children}
    </section>
  );
}

function StaffChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-4 py-3 rounded-none text-sm font-bold cursor-pointer font-sans border',
        'transition-all duration-150 motion-safe:active:scale-[0.97]',
        selected
          ? 'bg-[#0B1220] border-[#0B1220] text-[#F9F9F6]'
          : 'bg-white border-[#D6DBE5] text-[#0B1220]/70 hover:border-[#0B1220]',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
